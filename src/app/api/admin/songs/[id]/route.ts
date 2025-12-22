import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// PUT /api/admin/songs/[id] - Update song (approve/reject/mark played)
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
    const { status, title, artist } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (artist !== undefined) updateData.artist = artist;

    if (Object.keys(updateData).length === 0) {
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

    return NextResponse.json({
      success: true,
      song,
    });
  } catch (error) {
    console.error('Update song error:', error);
    return NextResponse.json(
      { error: 'Failed to update song' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/songs/[id] - Delete song
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

    // Delete votes first (cascade should handle this but just in case)
    await supabase.from('song_votes').delete().eq('song_id', id);

    const { error } = await supabase
      .from('song_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete song error:', error);
    return NextResponse.json(
      { error: 'Failed to delete song' },
      { status: 500 }
    );
  }
}
