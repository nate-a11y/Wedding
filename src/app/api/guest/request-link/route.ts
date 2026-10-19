import { requireBotCheck } from '@/lib/turnstile';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase-server';
import { parseJsonRequest } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAuthSessionSecret } from '@/lib/auth-session';
import { createGuestSignInToken, isKnownGuest } from '@/lib/guest-access';
import { isEmailConfigured, sendLoggedEmail } from '@/lib/email';

const schema = z.object({ email: z.string().trim().email().max(254).toLowerCase() }).strict();

export async function POST(request: NextRequest) {
  const botError = await requireBotCheck(request, 'guest-sign-in');
  if (botError) return botError;
  if (!supabase || !isEmailConfigured() || !getAuthSessionSecret('guest')) {
    return NextResponse.json({ error: 'Guest sign-in is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  const parsed = await parseJsonRequest(request, schema);
  if (!parsed.success) return parsed.response;
  const { email } = parsed.data;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limits = await Promise.all([
    checkRateLimit(`guest-link:ip:${ip}`, { maxRequests: 3, windowMs: 15 * 60_000 }),
    checkRateLimit(`guest-link:email:${createHash('sha256').update(email).digest('hex')}`, { maxRequests: 3, windowMs: 60 * 60_000 }),
  ]);
  if (limits.some(limit => !limit.allowed)) {
    return NextResponse.json({ error: 'Please wait before requesting another sign-in link.' }, { status: 429 });
  }
  const genericResponse = () => NextResponse.json({ success: true, message: 'If this email is on our guest list, a private sign-in link is on its way. Check your inbox and spam folder, or contact Nate and Blake if you need help.' });
  try {
    if (!await isKnownGuest(supabase, email)) return genericResponse();
    const token = await createGuestSignInToken(supabase, email);
    const origin = process.env.NODE_ENV === 'production' ? 'https://www.nateandblake.me' : request.nextUrl.origin;
    const url = new URL('/guest/sign-in', origin);
    url.searchParams.set('token', token);
    const result = await sendLoggedEmail({
      to: [email], emailType: 'guest_sign_in', subject: 'Your private wedding invitation link — Nate & Blake',
      html: `<div style="background:#191a17;color:#f8f3e8;padding:32px;font-family:Georgia,serif;max-width:600px;margin:auto"><h1 style="color:#d2b344">A little invitation, just for you</h1><p>Sign in to see the celebrations you’re invited to for Nate &amp; Blake’s wedding.</p><p><a style="display:inline-block;background:#536039;color:#fff;padding:16px 24px;border-radius:8px" href="${url.toString().replaceAll('&', '&amp;')}">View my invitations</a></p><p>This link expires in 15 minutes and works once. After signing in, this browser remembers you for 30 days.</p><p>If you didn’t request this, you can ignore this email.</p><p>With love,<br>Nate &amp; Blake</p></div>`,
    });
    if (result.error) console.error('Guest sign-in email could not be sent.');
    return genericResponse();
  } catch {
    return NextResponse.json({ error: 'Guest sign-in is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
