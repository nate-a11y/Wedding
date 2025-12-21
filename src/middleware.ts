import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Check if we're on the admin subdomain
  if (hostname.startsWith('admin.')) {
    // If accessing root of admin subdomain, rewrite to /admin
    if (url.pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }

    // If accessing any path on admin subdomain that doesn't start with /admin,
    // prefix it with /admin (except for static files and API routes)
    if (
      !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/api') &&
      !url.pathname.startsWith('/_next') &&
      !url.pathname.startsWith('/icons') &&
      !url.pathname.includes('.')
    ) {
      url.pathname = `/admin${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
