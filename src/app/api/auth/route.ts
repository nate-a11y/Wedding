import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'Honey2027!';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === SITE_PASSWORD) {
      const cookieStore = await cookies();

      // Set auth cookie - expires in 30 days
      cookieStore.set('wedding-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
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
  cookieStore.delete('wedding-auth');

  return NextResponse.json({ success: true });
}
