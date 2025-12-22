import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/songs - All songs including pending
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ songs: [], stats: {} });
  }

  try {
    const { data: songs, error } = await supabase
      .from('song_requests')
      .select('*')
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate stats
    const stats = {
      total: songs?.length || 0,
      approved: songs?.filter((s) => s.status === 'approved').length || 0,
      pending: songs?.filter((s) => s.status === 'pending').length || 0,
      rejected: songs?.filter((s) => s.status === 'rejected').length || 0,
      played: songs?.filter((s) => s.status === 'played').length || 0,
    };

    return NextResponse.json({
      songs: songs || [],
      stats,
    });
  } catch (error) {
    console.error('Admin songs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/songs - Migrate songs from RSVP song_request field
export async function POST() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get all RSVPs with song requests
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('email, name, song_request')
      .not('song_request', 'is', null)
      .neq('song_request', '');

    if (rsvpError) throw rsvpError;

    if (!rsvps || rsvps.length === 0) {
      return NextResponse.json({
        success: true,
        migrated: 0,
        message: 'No song requests found in RSVPs',
      });
    }

    // Parse and insert songs
    const songsToInsert = [];
    for (const rsvp of rsvps) {
      if (!rsvp.song_request) continue;

      // Try to parse "Song - Artist" format
      const parts = rsvp.song_request.split(' - ');
      const title = parts[0]?.trim() || rsvp.song_request.trim();
      const artist = parts[1]?.trim() || null;

      // Check if already exists
      const { data: existing } = await supabase
        .from('song_requests')
        .select('id')
        .ilike('title', title)
        .eq('submitted_by_email', rsvp.email.toLowerCase())
        .single();

      if (!existing) {
        songsToInsert.push({
          title,
          artist,
          submitted_by_email: rsvp.email.toLowerCase(),
          submitted_by_name: rsvp.name,
          source: 'rsvp',
          status: 'pending',
          votes: 0,
        });
      }
    }

    if (songsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('song_requests')
        .insert(songsToInsert);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      migrated: songsToInsert.length,
      message: `Migrated ${songsToInsert.length} song requests from RSVPs`,
    });
  } catch (error) {
    console.error('Migrate songs error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate songs' },
      { status: 500 }
    );
  }
}
