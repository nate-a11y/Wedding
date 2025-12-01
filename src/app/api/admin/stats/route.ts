import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
}

export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get RSVP stats - include additional_guests for accurate counting
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('attending, additional_guests');

    if (rsvpError) throw rsvpError;

    const attending = rsvps?.filter(r => r.attending) || [];
    const notAttending = rsvps?.filter(r => !r.attending) || [];

    // Count total additional guests from attending RSVPs
    let additionalGuestsCount = 0;
    let childrenCount = 0;

    attending.forEach(rsvp => {
      const guests: AdditionalGuest[] = rsvp.additional_guests || [];
      additionalGuestsCount += guests.length;
      childrenCount += guests.filter(g => g.isChild).length;
    });

    // Total guests = primary attendees + their additional guests
    const totalGuests = attending.length + additionalGuestsCount;

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
        additionalGuests: additionalGuestsCount,
        children: childrenCount,
        totalGuests,
        // Keep plusOnes for backwards compatibility (now represents additional guests)
        plusOnes: additionalGuestsCount,
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
