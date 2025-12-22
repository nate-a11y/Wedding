import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/songs - List approved songs with vote counts (public)
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ songs: [] });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const voter_email = searchParams.get('voter_email');

    // Get all approved songs
    const { data: songs, error } = await supabase
      .from('song_requests')
      .select('*')
      .eq('status', 'approved')
      .order('votes', { ascending: false });

    if (error) throw error;

    // If voter_email provided, get their votes
    let userVotes: string[] = [];
    if (voter_email) {
      const { data: votes } = await supabase
        .from('song_votes')
        .select('song_id')
        .eq('voter_email', voter_email.toLowerCase());
      userVotes = (votes || []).map((v) => v.song_id);
    }

    return NextResponse.json({
      songs: songs || [],
      userVotes,
    });
  } catch (error) {
    console.error('Songs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

// POST /api/songs - Submit new song request (if enabled)
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { title, artist, submitted_by_email, submitted_by_name } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Song title is required' },
        { status: 400 }
      );
    }

    // Insert song request (status: pending for moderation)
    const { data: song, error } = await supabase
      .from('song_requests')
      .insert({
        title: title.trim(),
        artist: artist?.trim() || null,
        submitted_by_email: submitted_by_email?.toLowerCase() || null,
        submitted_by_name: submitted_by_name?.trim() || null,
        source: 'direct',
        status: 'pending',
        votes: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      song,
    });
  } catch (error) {
    console.error('Submit song error:', error);
    return NextResponse.json(
      { error: 'Failed to submit song' },
      { status: 500 }
    );
  }
}
