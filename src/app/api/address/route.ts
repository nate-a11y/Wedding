import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendAddressConfirmation } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';
import { badRequest } from '@/lib/api-response';
import { addressSubmissionSchema, parseJsonRequest } from '@/lib/validation';

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
  const rateLimit = await checkRateLimit(`address:${ip}`, { windowMs: 60000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const parsed = await parseJsonRequest(request, addressSubmissionSchema);
    if (!parsed.success) return parsed.response;

    const body = parsed.data;

    if (!await verifyTurnstile(body.turnstileToken, ip.split(',')[0].trim(), request.nextUrl.hostname, 'address')) {
      return badRequest('Captcha verification failed. Please try again.');
    }

    const country = body.country;
    const email = body.email;

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
      state: body.state?.trim() || null,
      postal_code: body.postalCode.trim(),
      country: country,
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
        state: body.state || '',
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
