import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// PUT /api/admin/live/[id] - Edit/pin update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { message, type, pinned } = body;

    const updateData: Record<string, unknown> = {};
    if (message !== undefined) updateData.message = message;
    if (type !== undefined) updateData.type = type;
    if (pinned !== undefined) updateData.pinned = pinned;

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

    return NextResponse.json({
      success: true,
      update,
    });
  } catch (error) {
    console.error('Update live update error:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/live/[id] - Delete update
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    const { error } = await supabase
      .from('live_updates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete live update error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
