import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase-server';
import { runDueScheduledLiveUpdates } from '@/lib/live-scheduled';

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const result = await runDueScheduledLiveUpdates();
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}
