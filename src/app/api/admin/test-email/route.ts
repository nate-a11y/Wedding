import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/admin-auth';
import { logAdminAuditEvent } from '@/lib/admin-audit';
import { sendAdminTestEmail } from '@/lib/admin-operations';

export const runtime = 'nodejs';

const testEmailSchema = z.object({
  to: z.email(),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const parsed = testEmailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A valid recipient email is required', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await sendAdminTestEmail(parsed.data.to);
  await logAdminAuditEvent({
    request,
    action: 'test_email',
    entity: 'operations',
    status: result.ok ? 'success' : 'failure',
    details: {
      provider: result.provider,
      recipient_domain: parsed.data.to.split('@')[1] || null,
      error: result.error,
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
