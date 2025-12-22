import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

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

// Core wedding events - all guests are invited to these
const CORE_EVENTS = ['ceremony', 'cocktail', 'reception', 'sendoff'];

// Helper to get invited events for an email
async function getInvitedEvents(email: string): Promise<string[]> {
  if (!supabase) return CORE_EVENTS;

  // Start with core events (everyone is invited)
  const invitedEvents = [...CORE_EVENTS];

  // Check for restricted event invitations
  const { data: eventInvites } = await supabase
    .from('guest_events')
    .select('event_slug')
    .eq('email', email.toLowerCase());

  if (eventInvites) {
    for (const invite of eventInvites) {
      if (!invitedEvents.includes(invite.event_slug)) {
        invitedEvents.push(invite.event_slug);
      }
    }
  }

  return invitedEvents;
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
  const rateLimit = checkRateLimit(`rsvp-lookup:${ip}`, { windowMs: 60000, maxRequests: 10 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check for existing RSVP with this email
    const { data: existingRsvp, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, name, email, attending, meal_choice, dietary_restrictions, additional_guests, song_request, message')
      .eq('email', email)
      .single();

    if (rsvpError && rsvpError.code !== 'PGRST116') {
      console.error('RSVP lookup error:', rsvpError);
    }

    // Get invited events for this guest
    const invitedEvents = await getInvitedEvents(email);

    // If guest has existing RSVP, return it for editing
    if (existingRsvp) {
      const eventResponses = await getEventResponses(existingRsvp.id);
      return NextResponse.json({
        status: 'existing_rsvp',
        rsvp: existingRsvp as RSVPRecord,
        invitedEvents,
        eventResponses,
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
        message: `Welcome, ${address.name}! We have your address on file. Just complete your RSVP below.`,
      });
    }

    // No records found - guest needs to provide all information
    return NextResponse.json({
      status: 'new_guest',
      invitedEvents,
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
