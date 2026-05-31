import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { badRequest, validationErrorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';
import { createRsvpEditToken, maskEmail } from '@/lib/rsvp-token';
import { sendRSVPEditLink } from '@/lib/email';

const editLinkRequestSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
});

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'RSVP system is not configured' },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`rsvp-edit-link:${ip}`, {
    windowMs: 60_000,
    maxRequests: 3,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many edit-link requests. Please try again later.' },
      { status: 429 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON payload');
  }

  const parsed = editLinkRequestSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { email } = parsed.data;

  // Avoid account enumeration: return a generic success response even when no RSVP exists.
  const genericResponse = NextResponse.json({
    success: true,
    maskedEmail: maskEmail(email),
    message: 'If an RSVP exists for that email, a private edit link is on the way.',
  });

  try {
    const { data: rsvp, error } = await supabase
      .from('rsvps')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('RSVP edit-link lookup error:', error);
      return genericResponse;
    }

    if (!rsvp?.id || !rsvp.email) {
      return genericResponse;
    }

    const token = await createRsvpEditToken(supabase, {
      rsvpId: rsvp.id,
      email: rsvp.email,
      origin: request.nextUrl.origin,
    });

    if (!token) return genericResponse;

    await sendRSVPEditLink({
      to: rsvp.email,
      name: rsvp.name || 'there',
      editUrl: token.editUrl,
      expiresAt: token.expiresAt,
    });

    return genericResponse;
  } catch (error) {
    console.error('RSVP edit-link request error:', error);
    return genericResponse;
  }
}
