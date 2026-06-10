import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { logAdminAuditEvent, getAuditErrorDetails } from '@/lib/admin-audit';
import { badRequest } from '@/lib/api-response';
import { sendLivePushNotification, type LivePushResult } from '@/lib/live-push';
import {
  computeLivestreamStatus,
  getLivestreamSettings,
  serializeLivestreamState,
  type LivestreamSettingsRow,
  type LivestreamStatusMode,
} from '@/lib/livestream';

export const runtime = 'nodejs';

const VALID_MODES: LivestreamStatusMode[] = ['auto', 'upcoming', 'live', 'ended'];

// GET - Current livestream settings for the admin controls
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const settings = await getLivestreamSettings();

  return NextResponse.json({
    settings,
    state: serializeLivestreamState(settings),
  });
}

// PUT - Update livestream settings; optionally notify guests when going live
export async function PUT(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { video_id, status_mode, go_live_at, end_at, notify } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (video_id !== undefined) {
      if (video_id !== null && typeof video_id !== 'string') {
        return badRequest('video_id must be a string');
      }
      const trimmed = typeof video_id === 'string' ? video_id.trim() : null;
      if (trimmed && !/^[\w-]{5,20}$/.test(trimmed)) {
        return badRequest('video_id does not look like a valid YouTube video ID');
      }
      updates.video_id = trimmed || null;
    }

    if (status_mode !== undefined) {
      if (!VALID_MODES.includes(status_mode)) {
        return badRequest(`status_mode must be one of: ${VALID_MODES.join(', ')}`);
      }
      updates.status_mode = status_mode;
    }

    for (const [field, value] of [['go_live_at', go_live_at], ['end_at', end_at]] as const) {
      if (value !== undefined) {
        if (value !== null && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) {
          return badRequest(`${field} must be a valid timestamp or null`);
        }
        updates[field] = value;
      }
    }

    const existing = await getLivestreamSettings();

    let saved: LivestreamSettingsRow;
    if (existing) {
      const { data, error } = await supabase
        .from('livestream_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      saved = data as LivestreamSettingsRow;
    } else {
      const { data, error } = await supabase
        .from('livestream_settings')
        .insert([updates])
        .select()
        .single();
      if (error) throw error;
      saved = data as LivestreamSettingsRow;
    }

    // Notify guests once per go-live: only when explicitly requested, the
    // stream is effectively live, and we haven't already pushed for it.
    let pushResult: LivePushResult | null = null;
    if (notify === true && computeLivestreamStatus(saved) === 'live' && !saved.live_notified_at) {
      pushResult = await sendLivePushNotification({
        message: "We're live! Watch the ceremony right now from anywhere.",
        type: 'celebration',
        url: '/livestream',
        tag: 'livestream-live',
      });

      if (pushResult.configured && !pushResult.error) {
        const notifiedAt = new Date().toISOString();
        const { error: stampError } = await supabase
          .from('livestream_settings')
          .update({ live_notified_at: notifiedAt })
          .eq('id', saved.id);
        if (!stampError) {
          saved = { ...saved, live_notified_at: notifiedAt };
        }
      }
    }

    // Leaving the live state re-arms the go-live notification for a retake.
    if (saved.live_notified_at && computeLivestreamStatus(saved) !== 'live') {
      const { error: resetError } = await supabase
        .from('livestream_settings')
        .update({ live_notified_at: null })
        .eq('id', saved.id);
      if (!resetError) {
        saved = { ...saved, live_notified_at: null };
      }
    }

    await logAdminAuditEvent({
      request,
      action: 'update',
      entity: 'livestream_settings',
      entityId: saved.id,
      status: 'success',
      details: {
        statusMode: saved.status_mode,
        pushSent: pushResult ? pushResult.sent : null,
      },
    });

    return NextResponse.json({
      success: true,
      settings: saved,
      state: serializeLivestreamState(saved),
      pushResult,
    });
  } catch (error) {
    console.error('Livestream settings update error:', error);
    await logAdminAuditEvent({
      request,
      action: 'update',
      entity: 'livestream_settings',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'Failed to update livestream settings' }, { status: 500 });
  }
}
