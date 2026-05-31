import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthUrl } from '@/lib/microsoft-graph';
import { requireAdminAuth } from '@/lib/admin-auth';

const MICROSOFT_OAUTH_STATE_COOKIE = 'microsoft_oauth_state';
const MICROSOFT_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

/**
 * GET /api/auth/microsoft
 * Initiates Microsoft OAuth flow - redirects to Microsoft login
 */
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    // Generate an unguessable state for CSRF protection and bind it to the
    // browser with an httpOnly cookie for callback validation.
    const state = randomBytes(32).toString('base64url');
    const authUrl = getAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set({
      name: MICROSOFT_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/microsoft',
      maxAge: MICROSOFT_OAUTH_STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Microsoft auth error:', error);
    return NextResponse.redirect(
      new URL('/admin?tab=tasks&error=auth_failed', process.env.NEXT_PUBLIC_SITE_URL || 'https://nateandblake.me')
    );
  }
}
