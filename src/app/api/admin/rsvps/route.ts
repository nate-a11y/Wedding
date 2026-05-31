import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Fetch RSVPs with their event responses
    const { data: rsvps, error } = await supabase
      .from('rsvps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch all event responses
    const { data: eventResponses } = await supabase
      .from('rsvp_event_responses')
      .select('rsvp_id, event_slug, attending');

    // Create a map of rsvp_id -> event responses
    const eventResponseMap: Record<string, Record<string, boolean>> = {};
    for (const response of eventResponses || []) {
      if (!eventResponseMap[response.rsvp_id]) {
        eventResponseMap[response.rsvp_id] = {};
      }
      eventResponseMap[response.rsvp_id][response.event_slug] = response.attending;
    }

    // Attach event responses to each RSVP
    const rsvpsWithEvents = (rsvps || []).map(rsvp => ({
      ...rsvp,
      event_responses: eventResponseMap[rsvp.id] || {},
    }));

    return NextResponse.json({ rsvps: rsvpsWithEvents });
  } catch (error) {
    console.error('Admin RSVP fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSVPs' },
      { status: 500 }
    );
  }
}

// Delete RSVP entry
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let id: string | undefined;

  try {
    ({ id } = await request.json());

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'rsvp',
      entityId: id,
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin RSVP delete error:', error);
    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'rsvp',
      entityId: id,
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json(
      { error: 'Failed to delete RSVP' },
      { status: 500 }
    );
  }
}
