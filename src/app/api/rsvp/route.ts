import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendRSVPConfirmation } from '@/lib/email';

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
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

    // Check for duplicate RSVP
    const { data: existing, error: checkError } = await supabase
      .from('rsvps')
      .select('id, name')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is what we want
      console.error('Duplicate check error:', checkError);
    }

    if (existing) {
      return NextResponse.json(
        {
          error: `An RSVP has already been submitted with this email address (by ${existing.name}). If you need to update your response, please contact us.`,
          duplicate: true,
        },
        { status: 409 }
      );
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
      // Keep backwards compatibility - set plus_one based on additional guests
      plus_one: additionalGuests.length > 0,
      plus_one_name: additionalGuests.length > 0 ? additionalGuests[0].name : null,
      plus_one_meal_choice: additionalGuests.length > 0 ? additionalGuests[0].mealChoice : null,
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('rsvps')
      .insert([rsvpData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save RSVP. Please try again.' },
        { status: 500 }
      );
    }

    // Auto-link guest address if one exists with matching email
    const { error: linkError } = await supabase
      .from('guest_addresses')
      .update({ linked_rsvp_id: data.id })
      .eq('email', email);

    if (linkError) {
      // Non-critical error - log but don't fail the RSVP
      console.log('Note: Could not link address (may not exist):', linkError.message);
    }

    // Send confirmation email with all RSVP details
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
      message: attending
        ? `We can't wait to celebrate with you${guestText}! A confirmation email has been sent.`
        : "We're sorry you can't make it, but thank you for letting us know.",
      id: data.id,
    });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
