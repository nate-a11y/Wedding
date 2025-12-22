import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/songs/export - CSV export for DJ
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get approved songs sorted by votes
    const { data: songs, error } = await supabase
      .from('song_requests')
      .select('*')
      .eq('status', 'approved')
      .order('votes', { ascending: false });

    if (error) throw error;

    // Generate CSV
    const headers = ['Rank', 'Song', 'Artist', 'Votes', 'Requested By'];
    const rows = (songs || []).map((song, index) => [
      index + 1,
      escapeCSV(song.title),
      escapeCSV(song.artist || ''),
      song.votes,
      escapeCSV(song.submitted_by_name || 'Anonymous'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="wedding-playlist.csv"',
      },
    });
  } catch (error) {
    console.error('Export songs error:', error);
    return NextResponse.json(
      { error: 'Failed to export songs' },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
