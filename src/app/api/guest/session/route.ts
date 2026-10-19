import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { getVerifiedGuestEmail } from '@/lib/guest-access';
import { privateEventsFor } from '@/lib/private-events';

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const email = await getVerifiedGuestEmail(request);
  if (!email) return NextResponse.json({ email: null, events: [] }, { headers });
  if (!supabase) return NextResponse.json({ error: 'Invitations are temporarily unavailable.' }, { status: 503, headers });
  const { data, error } = await supabase.from('guest_events').select('event_slug').eq('email', email);
  if (error) return NextResponse.json({ error: 'Invitations are temporarily unavailable.' }, { status: 503, headers });
  return NextResponse.json({ email, events: privateEventsFor((data || []).map(row => row.event_slug)) }, { headers });
}
