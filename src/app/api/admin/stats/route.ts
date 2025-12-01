import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get RSVP stats
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('attending, plus_one');

    if (rsvpError) throw rsvpError;

    const attending = rsvps?.filter(r => r.attending) || [];
    const notAttending = rsvps?.filter(r => !r.attending) || [];
    const plusOnes = attending.filter(r => r.plus_one).length;
    const totalGuests = attending.length + plusOnes;

    // Get guestbook count
    const { count: guestbookCount, error: gbError } = await supabase
      .from('guestbook')
      .select('*', { count: 'exact', head: true });

    if (gbError) throw gbError;

    // Get photo count
    const { count: photoCount, error: photoError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true });

    if (photoError) throw photoError;

    return NextResponse.json({
      rsvps: {
        total: rsvps?.length || 0,
        attending: attending.length,
        notAttending: notAttending.length,
        plusOnes,
        totalGuests,
      },
      guestbook: guestbookCount || 0,
      photos: photoCount || 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
