import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendAddressConfirmation } from '@/lib/email';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// Verify Turnstile captcha token
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    // If Turnstile is not configured, skip verification
    return true;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Address collection system is not configured' },
      { status: 503 }
    );
  }

  // Rate limiting based on IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(`address:${ip}`, { windowMs: 60000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Verify Turnstile captcha if configured
    if (TURNSTILE_SECRET_KEY) {
      const turnstileToken = body.turnstileToken;
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Captcha verification required' },
          { status: 400 }
        );
      }

      const isValidCaptcha = await verifyTurnstile(turnstileToken, ip);
      if (!isValidCaptcha) {
        return NextResponse.json(
          { error: 'Captcha verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'streetAddress', 'city', 'state', 'postalCode'];
    const missingFields = requiredFields.filter(field => !body[field]?.trim());

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
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

    // Check if address already exists for this email
    const { data: existing } = await supabase
      .from('guest_addresses')
      .select('id, name')
      .eq('email', email)
      .single();

    // Prepare address data
    const addressData = {
      name: body.name.trim(),
      email: email,
      phone: body.phone.trim(),
      street_address: body.streetAddress.trim(),
      street_address_2: body.streetAddress2?.trim() || null,
      city: body.city.trim(),
      state: body.state.trim(),
      postal_code: body.postalCode.trim(),
      country: body.country?.trim() || 'United States',
    };

    let result;
    let isUpdate = false;

    if (existing) {
      // Update existing address
      const { data, error } = await supabase
        .from('guest_addresses')
        .update(addressData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json(
          { error: 'Failed to update address. Please try again.' },
          { status: 500 }
        );
      }
      result = data;
      isUpdate = true;
    } else {
      // Insert new address
      const { data, error } = await supabase
        .from('guest_addresses')
        .insert([addressData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json(
          { error: 'Failed to save address. Please try again.' },
          { status: 500 }
        );
      }
      result = data;
    }

    // Send confirmation email
    await sendAddressConfirmation({
      to: email,
      name: body.name.trim(),
      address: {
        street: body.streetAddress.trim(),
        street2: body.streetAddress2?.trim(),
        city: body.city.trim(),
        state: body.state.trim(),
        postalCode: body.postalCode.trim(),
        country: body.country?.trim() || 'United States',
      },
      isUpdate,
    });

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? 'Your address has been updated! A confirmation email has been sent.'
        : 'Thank you! Your address has been saved. A confirmation email has been sent.',
      id: result.id,
      isUpdate,
    });
  } catch (error) {
    console.error('Address submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
