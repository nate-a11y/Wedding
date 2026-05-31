import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAMES,
  getAuthSessionSecret,
  verifyAuthSession,
} from '@/lib/auth-session';

export async function requireAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const isAdminAuthenticated = await verifyAuthSession(
    cookieStore.get(AUTH_COOKIE_NAMES.admin)?.value,
    'admin',
    getAuthSessionSecret('admin')
  );

  if (isAdminAuthenticated) {
    return null;
  }

  return NextResponse.json(
    { error: 'Admin authentication required' },
    { status: 401 }
  );
}
