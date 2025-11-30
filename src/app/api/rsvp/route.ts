import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'RSVP system is not configured' },
      { status: 503 }
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

    // Prepare RSVP data
    const rsvpData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      attending: body.attending === 'yes' || body.attending === true,
      meal_choice: body.mealChoice || null,
      dietary_restrictions: body.dietaryRestrictions || null,
      plus_one: body.plusOne === 'yes' || body.plusOne === true,
      plus_one_name: body.plusOneName || null,
      plus_one_meal_choice: body.plusOneMealChoice || null,
      song_request: body.songRequest || null,
      message: body.message || null,
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

    return NextResponse.json({
      success: true,
      message: body.attending === 'yes' || body.attending === true
        ? "We can't wait to celebrate with you!"
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
