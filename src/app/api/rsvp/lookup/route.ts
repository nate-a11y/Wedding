import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { badRequest } from '@/lib/api-response';
import {
  buildRsvpEditUrl,
  CORE_RSVP_EVENTS,
  getInvitedRsvpEvents,
  getRsvpEditTokenContext,
  maskEmail,
  normalizeRsvpEditToken,
} from '@/lib/rsvp-token';

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
}

interface RSVPRecord {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  additional_guests: AdditionalGuest[];
  song_request: string | null;
  message: string | null;
}

interface AddressRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  linked_rsvp_id: string | null;
}

interface HouseholdRSVP {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  additional_guests: AdditionalGuest[];
}

// Helper to get existing event responses for an RSVP
async function getEventResponses(rsvpId: string): Promise<Record<string, boolean>> {
  if (!supabase) return {};

  const { data: responses } = await supabase
    .from('rsvp_event_responses')
    .select('event_slug, attending')
    .eq('rsvp_id', rsvpId);

  const result: Record<string, boolean> = {};
  for (const resp of responses || []) {
    result[resp.event_slug] = resp.attending;
  }
  return result;
}

function parseLookupPayload(payload: unknown): { email?: string; token?: string } | null {
  if (!payload || typeof payload !== 'object') return null;

  const { email, token } = payload as { email?: unknown; token?: unknown };
  const normalizedToken = normalizeRsvpEditToken(token);
  if (normalizedToken) {
    return { token: normalizedToken };
  }

  if (typeof email !== 'string') return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return null;
  }

  return { email: normalizedEmail };
}

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'RSVP system is not configured' },
      { status: 503 }
    );
  }

  // Rate limiting based on IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = await checkRateLimit(`rsvp-lookup:${ip}`, { windowMs: 60000, maxRequests: 10 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest('Invalid JSON payload');
    }

    const parsed = parseLookupPayload(payload);
    if (!parsed) {
      return badRequest('Provide a valid email address or RSVP edit token.');
    }

    const tokenContext = parsed.token
      ? await getRsvpEditTokenContext(supabase, parsed.token)
      : null;

    if (parsed.token && !tokenContext) {
      return NextResponse.json(
        { error: 'This RSVP edit link is invalid or expired.' },
        { status: 404 }
      );
    }

    const email = tokenContext?.email || parsed.email;
    if (!email) {
      return badRequest('Provide a valid email address or RSVP edit token.');
    }

    const hasToken = Boolean(tokenContext && parsed.token);

    // Check for existing RSVP with this email
    let existingRsvp: RSVPRecord | null = null;
    if (tokenContext?.rsvpId) {
      const { data, error: rsvpError } = await supabase
        .from('rsvps')
        .select('id, name, email, attending, meal_choice, dietary_restrictions, additional_guests, song_request, message')
        .eq('id', tokenContext.rsvpId)
        .single();

      if (rsvpError && rsvpError.code !== 'PGRST116') {
        console.error('RSVP token lookup error:', rsvpError);
      }
      existingRsvp = (data as RSVPRecord | null) || null;
    } else {
      const { data, error: rsvpError } = await supabase
        .from('rsvps')
        .select('id, name, email, attending, meal_choice, dietary_restrictions, additional_guests, song_request, message')
        .eq('email', email)
        .single();

      if (rsvpError && rsvpError.code !== 'PGRST116') {
        console.error('RSVP lookup error:', rsvpError);
      }
      existingRsvp = (data as RSVPRecord | null) || null;
    }

    // Get invited events for this guest
    const invitedEvents = hasToken ? await getInvitedRsvpEvents(supabase, email) : [...CORE_RSVP_EVENTS];

    // If guest has existing RSVP, only tokenized links can return editable data.
    if (existingRsvp) {
      if (!hasToken || (tokenContext?.rsvpId && tokenContext.rsvpId !== existingRsvp.id)) {
        return NextResponse.json({
          status: 'existing_rsvp_token_required',
          hasExistingRsvp: true,
          maskedEmail: maskEmail(email),
          invitedEvents,
          message: 'We found an RSVP for that email. Please use your private RSVP edit link to view or change it.',
        });
      }

      const eventResponses = await getEventResponses(existingRsvp.id);
      return NextResponse.json({
        status: 'existing_rsvp',
        rsvp: existingRsvp,
        invitedEvents,
        eventResponses,
        editToken: parsed.token,
        editUrl: parsed.token ? buildRsvpEditUrl(request.nextUrl.origin, parsed.token) : undefined,
        message: `Welcome back, ${existingRsvp.name}! You can update your RSVP below.`,
      });
    }

    // Check for address record with this email
    const { data: addressRecord, error: addressError } = await supabase
      .from('guest_addresses')
      .select('id, name, email, phone, street_address, street_address_2, city, state, postal_code, country, linked_rsvp_id')
      .eq('email', email)
      .single();

    if (addressError && addressError.code !== 'PGRST116') {
      console.error('Address lookup error:', addressError);
    }

    // If guest has address record, check for household RSVPs
    if (addressRecord) {
      const address = addressRecord as AddressRecord;

      if (!hasToken) {
        return NextResponse.json({
          status: 'address_found',
          hasAddress: true,
          maskedEmail: maskEmail(email),
          invitedEvents,
          message: 'We have this email on the invitation list. Please complete your RSVP below.',
        });
      }

      // Look for other addresses at the same physical location (household detection)
      // Normalize comparison by trimming and lowercasing
      const { data: householdAddresses, error: householdError } = await supabase
        .from('guest_addresses')
        .select('id, name, email, linked_rsvp_id, street_address, city, state, postal_code')
        .neq('email', email)
        .not('linked_rsvp_id', 'is', null);

      if (householdError) {
        console.error('Household lookup error:', householdError);
      }

      // Filter for matching addresses (case-insensitive comparison)
      const matchingHousehold = (householdAddresses || []).filter((addr) => {
        const normalizeStr = (s: string | null) => (s || '').trim().toLowerCase();
        return (
          normalizeStr(addr.street_address) === normalizeStr(address.street_address) &&
          normalizeStr(addr.city) === normalizeStr(address.city) &&
          normalizeStr(addr.state) === normalizeStr(address.state) &&
          normalizeStr(addr.postal_code) === normalizeStr(address.postal_code)
        );
      });

      if (matchingHousehold.length > 0) {
        // Get the RSVPs for household members
        const householdRsvpIds = matchingHousehold
          .map(addr => addr.linked_rsvp_id)
          .filter((id): id is string => id !== null);

        if (householdRsvpIds.length > 0) {
          const { data: householdRsvps, error: householdRsvpError } = await supabase
            .from('rsvps')
            .select('id, name, email, attending, additional_guests')
            .in('id', householdRsvpIds);

          if (householdRsvpError) {
            console.error('Household RSVP lookup error:', householdRsvpError);
          }

          if (householdRsvps && householdRsvps.length > 0) {
            // Return household detection scenario
            return NextResponse.json({
              status: 'household_found',
              address: {
                id: address.id,
                name: address.name,
                phone: address.phone,
                street_address: address.street_address,
                street_address_2: address.street_address_2,
                city: address.city,
                state: address.state,
                postal_code: address.postal_code,
                country: address.country,
              },
              householdRsvps: householdRsvps as HouseholdRSVP[],
              invitedEvents,
              editToken: parsed.token,
              editUrl: parsed.token ? buildRsvpEditUrl(request.nextUrl.origin, parsed.token) : undefined,
              message: `Hi ${address.name}! We see someone from your household has already RSVPed.`,
            });
          }
        }
      }

      // Has address but no household RSVP - pre-fill from address record
      return NextResponse.json({
        status: 'address_found',
        address: {
          id: address.id,
          name: address.name,
          phone: address.phone,
          street_address: address.street_address,
          street_address_2: address.street_address_2,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
        },
        invitedEvents,
        editToken: parsed.token,
        editUrl: parsed.token ? buildRsvpEditUrl(request.nextUrl.origin, parsed.token) : undefined,
        message: `Welcome, ${address.name}! We have your address on file. Just complete your RSVP below.`,
      });
    }

    // No records found - guest needs to provide all information
    return NextResponse.json({
      status: 'new_guest',
      invitedEvents,
      editToken: parsed.token,
      editUrl: parsed.token ? buildRsvpEditUrl(request.nextUrl.origin, parsed.token) : undefined,
      message: 'Welcome! Please provide your information to RSVP.',
    });
  } catch (error) {
    console.error('RSVP lookup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
