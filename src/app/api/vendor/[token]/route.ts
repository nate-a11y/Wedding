import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/vendor/[token] - Validate token and return vendor portal data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { token } = await params;

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('vendor_portal_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired access link' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access link has expired' },
        { status: 401 }
      );
    }

    // Update last accessed time
    await supabase
      .from('vendor_portal_tokens')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Fetch timeline events
    const { data: timeline, error: timelineError } = await supabase
      .from('timeline_events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        duration_minutes,
        location,
        location_notes,
        responsible_person,
        participants,
        category,
        is_milestone,
        color,
        notes,
        staff_notes,
        vendor_id
      `)
      .order('start_time', { ascending: true });

    if (timelineError) throw timelineError;

    // Optionally filter timeline for specific vendor role
    let filteredTimeline = timeline || [];

    // If vendor has a linked vendor_id, show events where they're assigned
    // Otherwise show all events (for coordinators/DJs/general staff)
    if (tokenData.vendor_id) {
      filteredTimeline = filteredTimeline.filter(
        (event) => event.vendor_id === tokenData.vendor_id || !event.vendor_id
      );
    }

    // Get venue info from site settings or use defaults
    const venueInfo = {
      name: 'The Gothic Chapel',
      address: '123 Cemetery Lane, Sleepy Hollow, NY 10591',
      contactName: 'Morticia Adams',
      contactPhone: '(555) 666-1313',
      contactEmail: 'morticia@gothicchapel.com',
      parkingNotes: 'Vendor parking available in the east lot. Enter through the iron gates.',
      loadInNotes: 'Load-in through the service entrance on the south side of the building.',
      wifiNetwork: 'Chapel-Staff',
      wifiPassword: 'SpookyWedding2027',
      notes: 'Please check in with the venue coordinator upon arrival.',
    };

    // Wedding date and basic info
    const weddingInfo = {
      date: '2027-10-31',
      coupleName: 'Morticia & Gomez',
      guestCount: 150,
    };

    return NextResponse.json({
      vendor: {
        name: tokenData.vendor_name,
        role: tokenData.role,
      },
      timeline: filteredTimeline,
      venue: venueInfo,
      wedding: weddingInfo,
    });
  } catch (error) {
    console.error('Vendor portal fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load vendor portal' },
      { status: 500 }
    );
  }
}
