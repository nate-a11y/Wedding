import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-server';
import { parseJsonRequest } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { AUTH_COOKIE_NAMES, createAuthSession, getAuthSessionSecret } from '@/lib/auth-session';
import { consumeGuestSignInToken, GUEST_SESSION_SECONDS } from '@/lib/guest-access';

const schema = z.object({ token: z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/) }).strict();

export async function POST(request: NextRequest) {
  const secret = getAuthSessionSecret('guest');
  if (!supabase || !secret) return NextResponse.json({ error: 'Guest sign-in is unavailable.' }, { status: 503 });
  // A form on another origin must not be able to replace a guest's signed-in identity.
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await checkRateLimit(`guest-verify:${ip}`, { maxRequests: 10 })).allowed) return NextResponse.json({ error: 'Too many attempts. Please try again shortly.' }, { status: 429 });
  const parsed = await parseJsonRequest(request, schema);
  if (!parsed.success) return parsed.response;
  try {
    const email = await consumeGuestSignInToken(supabase, parsed.data.token);
    if (!email) return NextResponse.json({ error: 'This sign-in link has expired or was already used. Please request a new one.' }, { status: 401 });
    const session = await createAuthSession('guest', secret, GUEST_SESSION_SECONDS, email);
    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE_NAMES.guest, session, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: GUEST_SESSION_SECONDS,
      ...(request.nextUrl.hostname.endsWith('.nateandblake.me') || request.nextUrl.hostname === 'nateandblake.me' ? { domain: '.nateandblake.me' } : {}),
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return NextResponse.json({ error: 'Guest sign-in is temporarily unavailable.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAMES.guest, '', {
    path: '/', maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    ...(request.nextUrl.hostname.endsWith('.nateandblake.me') || request.nextUrl.hostname === 'nateandblake.me' ? { domain: '.nateandblake.me' } : {}),
  });
  return response;
}
