import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

// PUT /api/admin/songs/[id] - Update song (approve/reject/mark played)
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

  const { id } = await params;
  const updateData: Record<string, unknown> = {};

  try {
    const body = await request.json();
    const { status, title, artist } = body;

    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (artist !== undefined) updateData.artist = artist;

    if (Object.keys(updateData).length === 0) {
      await logAdminAuditEvent({
        request,
        action: 'update',
        entity: 'song_request',
        entityId: id,
        status: 'failure',
        details: { error: 'No updates provided' },
      });
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const { data: song, error } = await supabase
      .from('song_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: status !== undefined ? 'moderate' : 'update',
      entity: 'song_request',
      entityId: id,
      status: 'success',
      details: {
        updated_fields: Object.keys(updateData),
        moderation_status: status,
      },
    });

    return NextResponse.json({
      success: true,
      song,
    });
  } catch (error) {
    console.error('Update song error:', error);
    await logAdminAuditEvent({
      request,
      action: Object.prototype.hasOwnProperty.call(updateData, 'status') ? 'moderate' : 'update',
      entity: 'song_request',
      entityId: id,
      status: 'failure',
      details: {
        updated_fields: Object.keys(updateData),
        ...getAuditErrorDetails(error),
      },
    });
    return NextResponse.json(
      { error: 'Failed to update song' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/songs/[id] - Delete song
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

  const { id } = await params;

  try {
    // Delete votes first (cascade should handle this but just in case)
    await supabase.from('song_votes').delete().eq('song_id', id);

    const { error } = await supabase
      .from('song_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'song_request',
      entityId: id,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete song error:', error);
    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'song_request',
      entityId: id,
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json(
      { error: 'Failed to delete song' },
      { status: 500 }
    );
  }
}
