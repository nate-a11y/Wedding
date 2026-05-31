import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAdminOperationsReadiness } from '@/lib/admin-operations';

export const runtime = 'nodejs';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const readiness = await getAdminOperationsReadiness();
  return NextResponse.json(readiness);
}
