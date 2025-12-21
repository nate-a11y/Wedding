import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Separate passwords for guest site and admin (must be set via environment variables)
const GUEST_PASSWORD = process.env.GUEST_PASSWORD || process.env.SITE_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    const { password, type } = await request.json();
    const isAdmin = type === 'admin';

    const correctPassword = isAdmin ? ADMIN_PASSWORD : GUEST_PASSWORD;

    // Ensure password is configured
    if (!correctPassword) {
      console.error(`${isAdmin ? 'ADMIN' : 'GUEST'}_PASSWORD environment variable not set`);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const cookieName = isAdmin ? 'wedding-admin-auth' : 'wedding-guest-auth';

    if (password === correctPassword) {
      const cookieStore = await cookies();

      // Set auth cookie - expires in 30 days
      // Use domain to share across subdomains
      cookieStore.set(cookieName, 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.nateandblake.me' : undefined,
      });

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

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('wedding-guest-auth');
  cookieStore.delete('wedding-admin-auth');

  return NextResponse.json({ success: true });
}
