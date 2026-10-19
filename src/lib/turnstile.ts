import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function verifyTurnstile(token: unknown, ip: string, hostname: string, action?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true && result.hostname === hostname && (!action || result.action === action);
  } catch {
    return false;
  }
}

export async function requireBotCheck(request: NextRequest, action: string) {
  if (!request.headers.get('x-turnstile-token')) return NextResponse.json({ error: 'Please complete the bot verification and try again.' }, { status: 403 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = await checkRateLimit(`public-form:${action}:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  if (!process.env.TURNSTILE_SECRET_KEY && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Bot protection is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  if (!await verifyTurnstile(request.headers.get('x-turnstile-token'), ip, request.nextUrl.hostname, action)) {
    return NextResponse.json({ error: 'Please complete the bot verification and try again.' }, { status: 403 });
  }
  return null;
}
