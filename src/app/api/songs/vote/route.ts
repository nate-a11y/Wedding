import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// POST /api/songs/vote - Cast vote for a song
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { song_id, voter_email } = body;

    if (!song_id || !voter_email) {
      return NextResponse.json(
        { error: 'Song ID and email are required' },
        { status: 400 }
      );
    }

    const email = voter_email.toLowerCase().trim();

    // Check if already voted
    const { data: existing } = await supabase
      .from('song_votes')
      .select('id')
      .eq('song_id', song_id)
      .eq('voter_email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already voted for this song' },
        { status: 400 }
      );
    }

    // Insert vote
    const { error: voteError } = await supabase
      .from('song_votes')
      .insert({
        song_id,
        voter_email: email,
      });

    if (voteError) throw voteError;

    // Increment vote count on song
    const { error: updateError } = await supabase.rpc('increment_song_votes', { song_id_param: song_id });

    // Fallback if RPC doesn't exist - just update directly
    if (updateError) {
      const { data: song } = await supabase
        .from('song_requests')
        .select('votes')
        .eq('id', song_id)
        .single();

      await supabase
        .from('song_requests')
        .update({ votes: (song?.votes || 0) + 1 })
        .eq('id', song_id);
    }

    // Get updated song
    const { data: updatedSong } = await supabase
      .from('song_requests')
      .select('*')
      .eq('id', song_id)
      .single();

    return NextResponse.json({
      success: true,
      song: updatedSong,
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}

// DELETE /api/songs/vote - Remove vote
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { song_id, voter_email } = body;

    if (!song_id || !voter_email) {
      return NextResponse.json(
        { error: 'Song ID and email are required' },
        { status: 400 }
      );
    }

    const email = voter_email.toLowerCase().trim();

    // Delete vote
    const { error: deleteError } = await supabase
      .from('song_votes')
      .delete()
      .eq('song_id', song_id)
      .eq('voter_email', email);

    if (deleteError) throw deleteError;

    // Decrement vote count on song
    const { data: song } = await supabase
      .from('song_requests')
      .select('votes')
      .eq('id', song_id)
      .single();

    await supabase
      .from('song_requests')
      .update({ votes: Math.max(0, (song?.votes || 1) - 1) })
      .eq('id', song_id);

    // Get updated song
    const { data: updatedSong } = await supabase
      .from('song_requests')
      .select('*')
      .eq('id', song_id)
      .single();

    return NextResponse.json({
      success: true,
      song: updatedSong,
    });
  } catch (error) {
    console.error('Remove vote error:', error);
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}
