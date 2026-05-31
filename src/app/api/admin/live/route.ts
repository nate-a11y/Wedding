import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';
import { sendLivePushNotification } from '@/lib/live-push';

// GET /api/admin/live - Get all updates with subscriber count
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ updates: [], subscriberCount: 0 });
  }

  try {
    const [updatesResult, deletedUpdatesResult, subscribersResult] = await Promise.all([
      supabase
        .from('live_updates')
        .select('*')
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('live_updates')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(10),
      supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact' }),
    ]);

    if (updatesResult.error) throw updatesResult.error;
    if (deletedUpdatesResult.error) throw deletedUpdatesResult.error;

    return NextResponse.json({
      updates: updatesResult.data || [],
      deletedUpdates: deletedUpdatesResult.data || [],
      subscriberCount: subscribersResult.count || 0,
    });
  } catch (error) {
    console.error('Admin live updates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/live - Post new update
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { message, type = 'info', posted_by, pinned = false, send_push = true, scheduled_for } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const scheduledFor = typeof scheduled_for === 'string' && scheduled_for.trim()
      ? new Date(scheduled_for)
      : null;

    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json(
        { error: 'scheduled_for must be a valid date/time' },
        { status: 400 }
      );
    }

    // Insert the update
    const { data: update, error } = await supabase
      .from('live_updates')
      .insert({
        message: message.trim(),
        type,
        posted_by,
        pinned,
        scheduled_for: scheduledFor?.toISOString() || null,
        push_requested: Boolean(send_push),
        push_status: send_push ? (scheduledFor && scheduledFor.getTime() > Date.now() ? 'scheduled' : 'pending') : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Send push notifications if enabled. Future-scheduled messages are picked up by the cron runner.
    const isFutureScheduled = scheduledFor ? scheduledFor.getTime() > Date.now() : false;
    let pushResult = null;
    let pushError: string | null = null;
    let pushedAt: string | null = null;
    if (send_push && !isFutureScheduled) {
      pushResult = await sendLivePushNotification({ message: message.trim(), type });
      pushError = pushResult.error || (!pushResult.configured ? 'Push is not configured' : null);
      pushedAt = pushError ? null : new Date().toISOString();
      await supabase
        .from('live_updates')
        .update({
          push_sent_at: pushedAt,
          push_status: pushError ? 'failed' : 'sent',
          push_error: pushError,
        })
        .eq('id', update.id);
    }

    await logAdminAuditEvent({
      request,
      action: scheduledFor ? 'schedule' : 'create',
      entity: 'live_update',
      entityId: update.id,
      status: 'success',
      details: {
        type,
        pinned,
        send_push,
        scheduled_for: scheduledFor?.toISOString(),
        push_sent: pushResult?.sent,
        push_failed: pushResult?.failed,
      },
    });

    return NextResponse.json({
      success: true,
      update: {
        ...update,
        push_requested: Boolean(send_push),
        push_status: send_push ? (isFutureScheduled ? 'scheduled' : pushError ? 'failed' : 'sent') : null,
        push_sent_at: pushedAt || update.push_sent_at,
        push_error: pushError,
      },
      pushResult,
      pushDeferredReason: send_push && isFutureScheduled ? 'scheduled_for_future' : null,
    });
  } catch (error) {
    console.error('Post live update error:', error);
    await logAdminAuditEvent({
      request,
      action: 'create',
      entity: 'live_update',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json(
      { error: 'Failed to post update' },
      { status: 500 }
    );
  }
}
