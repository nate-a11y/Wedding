import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

// PUT /api/admin/live/[id] - Edit/pin/restore update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let id: string | undefined;

  try {
    ({ id } = await params);
    const body = await request.json();
    const { message, type, pinned, scheduled_for, restore } = body;

    const updateData: Record<string, unknown> = {};
    if (restore === true) {
      updateData.deleted_at = null;
      updateData.deleted_by = null;
      updateData.deleted_reason = null;
      updateData.restored_at = new Date().toISOString();
    }
    if (message !== undefined) updateData.message = message;
    if (type !== undefined) updateData.type = type;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (scheduled_for !== undefined) {
      if (scheduled_for === null || scheduled_for === '') {
        updateData.scheduled_for = null;
        updateData.push_status = null;
      } else {
        const scheduledFor = new Date(scheduled_for);
        if (Number.isNaN(scheduledFor.getTime())) {
          return NextResponse.json(
            { error: 'scheduled_for must be a valid date/time' },
            { status: 400 }
          );
        }
        updateData.scheduled_for = scheduledFor.toISOString();
        updateData.push_requested = true;
        updateData.push_status = scheduledFor.getTime() > Date.now() ? 'scheduled' : 'pending';
        updateData.push_sent_at = null;
        updateData.push_error = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const { data: update, error } = await supabase
      .from('live_updates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: restore === true ? 'restore' : 'update',
      entity: 'live_update',
      entityId: id,
      status: 'success',
      details: {
        fields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      update,
    });
  } catch (error) {
    console.error('Update live update error:', error);
    await logAdminAuditEvent({
      request,
      action: 'update',
      entity: 'live_update',
      entityId: id,
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/live/[id] - Soft-delete update with rollback support
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let id: string | undefined;

  try {
    ({ id } = await params);
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' && body.reason.trim()
      ? body.reason.trim()
      : 'manual_delete';

    const { data: update, error } = await supabase
      .from('live_updates')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: 'admin',
        deleted_reason: reason,
        pinned: false,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'live_update',
      entityId: id,
      status: 'success',
      details: { reason, soft_delete: true },
    });

    return NextResponse.json({
      success: true,
      update,
    });
  } catch (error) {
    console.error('Delete live update error:', error);
    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'live_update',
      entityId: id,
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
