import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';
import { isSupabaseConfigured } from '@/lib/supabase-server';
import { runDueScheduledLiveUpdates } from '@/lib/live-scheduled';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const result = await runDueScheduledLiveUpdates();
    await logAdminAuditEvent({
      request,
      action: 'run_scheduled',
      entity: 'live_update',
      status: result.ok ? 'success' : 'failure',
      details: {
        due: result.due,
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors.map((item) => item.error).slice(0, 5),
      },
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    await logAdminAuditEvent({
      request,
      action: 'run_scheduled',
      entity: 'live_update',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'Failed to run scheduled updates' }, { status: 500 });
  }
}
