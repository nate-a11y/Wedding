import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/api/auth', '/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Determine if this is an admin subdomain request
  const isAdminSubdomain = hostname.startsWith('admin.');

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    (pathname.includes('.') && !pathname.startsWith('/api'))
  ) {
    return NextResponse.next();
  }

  // Allow public routes (login, auth API)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication for ALL routes (both guest site and admin)
  const isAuthenticated = request.cookies.get('wedding-auth')?.value === 'authenticated';

  if (!isAuthenticated) {
    // Redirect to login on the main domain
    const loginUrl = new URL('/login', 'https://nateandblake.me');
    // Preserve where they were trying to go
    if (isAdminSubdomain) {
      loginUrl.searchParams.set('redirect', '/admin');
    } else {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Handle admin subdomain routing (after auth check passes)
  if (isAdminSubdomain) {
    if (pathname === '/' || pathname === '') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    // Rewrite non-admin paths to /admin prefix
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
