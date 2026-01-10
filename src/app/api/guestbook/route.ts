import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendGuestbookThankYou } from '@/lib/email';

// GET - Fetch all guest book entries
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Guest book is not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('guestbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch guest book entries' },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries: data });
  } catch (error) {
    console.error('Guest book fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Add a new guest book entry
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Guest book is not configured' },
      { status: 503 }
    );
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(`guestbook:${ip}`, { windowMs: 60000, maxRequests: 3 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate that either message or media is provided
    if (!body.message && !body.media_url) {
      return NextResponse.json(
        { error: 'Please provide either a message or media' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate message length if provided
    if (body.message && body.message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validate media duration if provided
    if (body.media_duration && (body.media_duration > 120 || body.media_duration < 0)) {
      return NextResponse.json(
        { error: 'Media duration must be between 0 and 120 seconds' },
        { status: 400 }
      );
    }

    const entryData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      message: body.message ? body.message.trim() : null,
      media_url: body.media_url || null,
      media_type: body.media_type || null,
      media_duration: body.media_duration || null,
    };

    const { data, error } = await supabase
      .from('guestbook')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      );
    }

    // Send thank you email (await to see logs, but don't fail if email fails)
    try {
      await sendGuestbookThankYou({
        to: entryData.email,
        name: entryData.name,
        message: entryData.message || 'Thank you for your message!',
      });
    } catch (err) {
      console.error('Failed to send guestbook thank you email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for signing our guest book!',
      entry: data,
    });
  } catch (error) {
    console.error('Guest book error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
