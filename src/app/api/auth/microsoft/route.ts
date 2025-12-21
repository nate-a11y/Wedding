import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/microsoft-graph';

/**
 * GET /api/auth/microsoft
 * Initiates Microsoft OAuth flow - redirects to Microsoft login
 */
export async function GET() {
  try {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = getAuthUrl(state);

    // Redirect to Microsoft login
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Microsoft auth error:', error);
    return NextResponse.redirect(
      new URL('/admin?tab=tasks&error=auth_failed', process.env.NEXT_PUBLIC_SITE_URL || 'https://nateandblake.me')
    );
  }
}
