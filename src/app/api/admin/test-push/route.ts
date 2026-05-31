import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/admin-auth';
import { logAdminAuditEvent } from '@/lib/admin-audit';
import { sendAdminTestPush } from '@/lib/admin-operations';

export const runtime = 'nodejs';

const testPushSchema = z.object({
  subscriptionId: z.uuid().optional(),
  endpoint: z.url().optional(),
  latest: z.boolean().optional(),
  title: z.string().trim().min(1).max(80).optional(),
  body: z.string().trim().min(1).max(160).optional(),
}).refine(
  (value) => Boolean(value.subscriptionId || value.endpoint || value.latest),
  { message: 'Choose subscriptionId, endpoint, or latest=true' }
);

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const parsed = testPushSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A target push subscription is required', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await sendAdminTestPush(parsed.data);
  await logAdminAuditEvent({
    request,
    action: 'test_push',
    entity: 'operations',
    entityId: result.subscriptionId,
    status: result.ok ? 'success' : 'failure',
    details: {
      endpoint_hash: result.endpointHash,
      guest_email_present: result.guestEmailPresent,
      status_code: result.statusCode,
      error: result.error,
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
