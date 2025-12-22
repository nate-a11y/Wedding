import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendRSVPConfirmation } from '@/lib/email';

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
}

interface AddressData {
  name: string;
  email: string;
  phone: string;
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
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
  const rateLimit = checkRateLimit(`rsvp:${ip}`, { windowMs: 60000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email || body.attending === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and attending status' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const attending = body.attending === 'yes' || body.attending === true;

    // Check for existing RSVP
    const { data: existing, error: checkError } = await supabase
      .from('rsvps')
      .select('id, name')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Duplicate check error:', checkError);
    }

    // Process additional guests
    const additionalGuests: AdditionalGuest[] = (body.additionalGuests || [])
      .filter((g: AdditionalGuest) => g.name && g.name.trim() !== '')
      .map((g: AdditionalGuest) => ({
        name: g.name.trim(),
        mealChoice: g.mealChoice || '',
        isChild: Boolean(g.isChild),
      }));

    // Prepare RSVP data
    const rsvpData = {
      name: body.name.trim(),
      email: email,
      attending: attending,
      meal_choice: body.mealChoice || null,
      dietary_restrictions: body.dietaryRestrictions || null,
      additional_guests: additionalGuests,
      song_request: body.songRequest || null,
      message: body.message || null,
      // Keep backwards compatibility
      plus_one: additionalGuests.length > 0,
      plus_one_name: additionalGuests.length > 0 ? additionalGuests[0].name : null,
      plus_one_meal_choice: additionalGuests.length > 0 ? additionalGuests[0].mealChoice : null,
    };

    let rsvpId: string;
    let isUpdate = false;

    if (existing) {
      // Update existing RSVP
      const { data, error } = await supabase
        .from('rsvps')
        .update(rsvpData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json(
          { error: 'Failed to update RSVP. Please try again.' },
          { status: 500 }
        );
      }

      rsvpId = data.id;
      isUpdate = true;
    } else {
      // Insert new RSVP
      const { data, error } = await supabase
        .from('rsvps')
        .insert([rsvpData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json(
          { error: 'Failed to save RSVP. Please try again.' },
          { status: 500 }
        );
      }

      rsvpId = data.id;
    }

    // Handle address creation for new guests
    if (body.address && !body.existingAddressId) {
      const addressData: AddressData = body.address;

      // Validate address fields
      if (addressData.street_address && addressData.city && addressData.state && addressData.postal_code) {
        // Check if address already exists for this email
        const { data: existingAddress } = await supabase
          .from('guest_addresses')
          .select('id')
          .eq('email', email)
          .single();

        const addressRecord = {
          name: body.name.trim(),
          email: email,
          phone: addressData.phone?.trim() || null,
          street_address: addressData.street_address.trim(),
          street_address_2: addressData.street_address_2?.trim() || null,
          city: addressData.city.trim(),
          state: addressData.state.trim(),
          postal_code: addressData.postal_code.trim(),
          country: addressData.country?.trim() || 'United States',
          linked_rsvp_id: rsvpId,
        };

        if (existingAddress) {
          // Update existing address
          await supabase
            .from('guest_addresses')
            .update(addressRecord)
            .eq('id', existingAddress.id);
        } else {
          // Insert new address
          await supabase
            .from('guest_addresses')
            .insert([addressRecord]);
        }
      }
    }

    // Link existing address record to this RSVP
    if (body.existingAddressId) {
      await supabase
        .from('guest_addresses')
        .update({ linked_rsvp_id: rsvpId })
        .eq('id', body.existingAddressId);
    } else {
      // Auto-link guest address if one exists with matching email (fallback)
      const { error: linkError } = await supabase
        .from('guest_addresses')
        .update({ linked_rsvp_id: rsvpId })
        .eq('email', email);

      if (linkError) {
        console.log('Note: Could not link address (may not exist):', linkError.message);
      }
    }

    // Send confirmation email
    await sendRSVPConfirmation({
      to: email,
      name: body.name.trim(),
      attending: attending,
      mealChoice: body.mealChoice,
      dietaryRestrictions: body.dietaryRestrictions,
      additionalGuests: additionalGuests,
      songRequest: body.songRequest,
      message: body.message,
    });

    const guestCount = 1 + additionalGuests.length;
    const guestText = guestCount === 1 ? '' : ` (party of ${guestCount})`;

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? attending
          ? `Your RSVP has been updated${guestText}! A confirmation email has been sent.`
          : "Your RSVP has been updated. We're sorry you can't make it."
        : attending
          ? `We can't wait to celebrate with you${guestText}! A confirmation email has been sent.`
          : "We're sorry you can't make it, but thank you for letting us know.",
      id: rsvpId,
      isUpdate,
    });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Handle joining a household RSVP (adding as additional guest)
export async function PATCH(request: NextRequest) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'RSVP system is not configured' },
      { status: 503 }
    );
  }

  // Rate limiting based on IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(`rsvp:${ip}`, { windowMs: 60000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.householdRsvpId || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: householdRsvpId and name' },
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase();

    // Get the household RSVP
    const { data: householdRsvp, error: fetchError } = await supabase
      .from('rsvps')
      .select('id, name, additional_guests')
      .eq('id', body.householdRsvpId)
      .single();

    if (fetchError || !householdRsvp) {
      return NextResponse.json(
        { error: 'Household RSVP not found' },
        { status: 404 }
      );
    }

    // Add new guest to additional_guests array
    const currentGuests: AdditionalGuest[] = householdRsvp.additional_guests || [];
    const newGuest: AdditionalGuest = {
      name: body.name.trim(),
      mealChoice: body.mealChoice || '',
      isChild: Boolean(body.isChild),
    };

    const updatedGuests = [...currentGuests, newGuest];

    // Update the RSVP
    const { error: updateError } = await supabase
      .from('rsvps')
      .update({
        additional_guests: updatedGuests,
        plus_one: true,
        plus_one_name: updatedGuests[0]?.name || null,
        plus_one_meal_choice: updatedGuests[0]?.mealChoice || null,
      })
      .eq('id', body.householdRsvpId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to join household RSVP. Please try again.' },
        { status: 500 }
      );
    }

    // Link address if provided
    if (body.existingAddressId) {
      await supabase
        .from('guest_addresses')
        .update({ linked_rsvp_id: body.householdRsvpId })
        .eq('id', body.existingAddressId);
    } else if (email) {
      await supabase
        .from('guest_addresses')
        .update({ linked_rsvp_id: body.householdRsvpId })
        .eq('email', email);
    }

    return NextResponse.json({
      success: true,
      message: `You've been added to ${householdRsvp.name}'s party! See you at the wedding.`,
      householdRsvpId: body.householdRsvpId,
    });
  } catch (error) {
    console.error('Join household error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
