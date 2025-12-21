import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/api/auth', '/login', '/address', '/api/address'];

// Routes that require authentication (protected)
const PROTECTED_ROUTES = ['/admin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Determine if this is an admin subdomain request
  const isAdminSubdomain = hostname.startsWith('admin.');

  // Allow static files and Next.js internals first
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    (pathname.includes('.') && !pathname.startsWith('/api'))
  ) {
    return NextResponse.next();
  }

  // Allow public routes (but NOT on admin subdomain)
  if (!isAdminSubdomain && PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication for:
  // 1. Admin subdomain (always requires auth)
  // 2. Protected routes like /admin
  // 3. All other non-public routes
  const needsAuth = isAdminSubdomain ||
                    PROTECTED_ROUTES.some(route => pathname.startsWith(route)) ||
                    !PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (needsAuth) {
    const isAuthenticated = request.cookies.get('wedding-auth')?.value === 'authenticated';

    if (!isAuthenticated) {
      // For admin subdomain, redirect to main site login
      const loginUrl = isAdminSubdomain
        ? new URL('/login', `https://nateandblake.me`)
        : new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', isAdminSubdomain ? '/admin' : pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle admin subdomain routing (after auth check passes)
  if (isAdminSubdomain) {
    if (pathname === '/' || pathname === '') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    // Rewrite non-admin paths to /admin prefix
    if (
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/api')
    ) {
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
