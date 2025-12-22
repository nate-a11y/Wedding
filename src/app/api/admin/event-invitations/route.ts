import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/event-invitations - List all event invitations
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get('event');
    const email = searchParams.get('email');

    let query = supabase
      .from('guest_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventSlug) {
      query = query.eq('event_slug', eventSlug);
    }

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Also get counts per event
    const { data: allEvents } = await supabase
      .from('guest_events')
      .select('event_slug');

    const eventCounts: Record<string, number> = {};
    for (const { event_slug } of allEvents || []) {
      eventCounts[event_slug] = (eventCounts[event_slug] || 0) + 1;
    }

    return NextResponse.json({
      invitations: data || [],
      eventCounts,
    });
  } catch (error) {
    console.error('Admin event invitations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event invitations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/event-invitations - Add invitation(s)
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { emails, eventSlug, invitedBy } = await request.json();

    if (!eventSlug) {
      return NextResponse.json(
        { error: 'Event slug is required' },
        { status: 400 }
      );
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    const records = emails.map((email: string) => ({
      email: email.toLowerCase().trim(),
      event_slug: eventSlug,
      invited_by: invitedBy || null,
    }));

    const { error } = await supabase
      .from('guest_events')
      .upsert(records, { onConflict: 'email,event_slug' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Invited ${emails.length} guest(s) to ${eventSlug}`,
      count: emails.length,
    });
  } catch (error) {
    console.error('Admin event invitation add error:', error);
    return NextResponse.json(
      { error: 'Failed to add invitations' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/event-invitations - Remove invitation(s)
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id, email, eventSlug } = await request.json();

    if (id) {
      // Delete by ID
      const { error } = await supabase
        .from('guest_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    if (email && eventSlug) {
      // Delete by email + event
      const { error } = await supabase
        .from('guest_events')
        .delete()
        .eq('email', email.toLowerCase().trim())
        .eq('event_slug', eventSlug);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Either id or (email + eventSlug) is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin event invitation delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
