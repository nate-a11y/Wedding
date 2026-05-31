import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  AUTH_COOKIE_NAMES,
  AuthSessionRole,
  createAuthSession,
  getAuthSessionSecret,
  secureStringEquals,
} from '@/lib/auth-session';

// Separate passwords for guest site and admin (must be set via environment variables)
const SITE_PASSWORD = process.env.SITE_PASSWORD || process.env.GUEST_PASSWORD; // GUEST_PASSWORD kept as legacy fallback
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();
  return process.env.NODE_ENV === 'production' && host?.endsWith('nateandblake.me')
    ? '.nateandblake.me'
    : undefined;
}

function getCookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
    domain: getCookieDomain(request),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const role: AuthSessionRole = body?.type === 'admin' ? 'admin' : 'guest';
    const password = typeof body?.password === 'string' ? body.password : '';
    const correctPassword = role === 'admin' ? ADMIN_PASSWORD : SITE_PASSWORD;

    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(`auth:${role}:${ip}`, {
      windowMs: 60_000,
      maxRequests: role === 'admin' ? 5 : 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (!correctPassword) {
      console.error(`${role === 'admin' ? 'ADMIN_PASSWORD' : 'SITE_PASSWORD'} environment variable not set`);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (secureStringEquals(password, correctPassword)) {
      const sessionSecret = getAuthSessionSecret(role);
      if (!sessionSecret) {
        console.error('Auth session secret is not configured');
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const maxAge = role === 'admin' ? ADMIN_SESSION_MAX_AGE : GUEST_SESSION_MAX_AGE;
      const session = await createAuthSession(role, sessionSecret, maxAge);
      const cookieStore = await cookies();

      cookieStore.set(AUTH_COOKIE_NAMES[role], session, getCookieOptions(request, maxAge));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  for (const cookieName of Object.values(AUTH_COOKIE_NAMES)) {
    response.cookies.set(cookieName, '', getCookieOptions(request, 0));
  }

  return response;
}
