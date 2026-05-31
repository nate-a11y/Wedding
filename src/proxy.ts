import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAMES, getAuthSessionSecret, verifyAuthSession } from '@/lib/auth-session';

const PUBLIC_EXACT_ROUTES = new Set([
  '/login',
  '/address',
  '/api/auth',
  '/api/health',
]);

const PUBLIC_PREFIX_ROUTES = [
  '/api/webhooks',
  '/api/address',
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  if (PUBLIC_PREFIX_ROUTES.some(route => pathname.startsWith(route))) return true;

  // Vendor magic links are token-protected by the route itself. Token creation/listing stays admin-only.
  if (pathname.startsWith('/vendor/')) return true;
  if (pathname.startsWith('/api/vendor/') && pathname !== '/api/vendor/token') return true;

  return false;
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    (pathname.includes('.') && !pathname.startsWith('/api'))
  );
}

function isAdminRoute(pathname: string, isAdminSubdomain: boolean): boolean {
  return (
    isAdminSubdomain ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname === '/api/vendor/token' ||
    pathname.startsWith('/api/auth/microsoft')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  const isAdminSubdomain = hostname.startsWith('admin.');

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const adminRoute = isAdminRoute(pathname, isAdminSubdomain);
  const sessionRole = adminRoute ? 'admin' : 'guest';
  const cookieName = AUTH_COOKIE_NAMES[sessionRole];
  const isAuthenticated = await verifyAuthSession(
    request.cookies.get(cookieName)?.value,
    sessionRole,
    getAuthSessionSecret(sessionRole)
  );

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);

    if (adminRoute) {
      loginUrl.searchParams.set('redirect', '/admin');
    } else {
      loginUrl.searchParams.set('redirect', pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminSubdomain) {
    if (pathname === '/' || pathname === '') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
