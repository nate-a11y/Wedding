import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Determine if this is an admin subdomain request
  const isAdminSubdomain = hostname.startsWith('admin.');

  // Check if this is an admin route (subdomain or /admin path)
  const isAdminRoute = isAdminSubdomain || pathname.startsWith('/admin');

  // Only protect admin routes - everything else is public
  if (isAdminRoute) {
    // Allow static files on admin subdomain
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/icons') ||
      pathname.startsWith('/api') ||
      (pathname.includes('.') && !pathname.startsWith('/admin'))
    ) {
      return NextResponse.next();
    }

    // Check authentication for admin
    const isAuthenticated = request.cookies.get('wedding-auth')?.value === 'authenticated';

    if (!isAuthenticated) {
      // Redirect to main site login
      const loginUrl = new URL('/login', 'https://nateandblake.me');
      loginUrl.searchParams.set('redirect', '/admin');
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
  }

  // Everything else (guest site) is public - no auth required
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
