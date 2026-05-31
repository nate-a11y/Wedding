import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const isAdminAuthenticated = cookieStore.get('wedding-admin-auth')?.value === 'authenticated';

  if (isAdminAuthenticated) {
    return null;
  }

  return NextResponse.json(
    { error: 'Admin authentication required' },
    { status: 401 }
  );
}
