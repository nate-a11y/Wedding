import { NextResponse } from 'next/server';
import { isSupabaseServiceRoleConfigured, supabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type HealthCheck = {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: Record<string, boolean>;
};

export async function GET() {
  const checks: HealthCheck['checks'] = {
    sitePassword: Boolean(process.env.SITE_PASSWORD || process.env.GUEST_PASSWORD),
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRole: isSupabaseServiceRoleConfigured(),
    emailProvider: Boolean(process.env.RESEND_API_KEY || process.env.MICROSOFT_CLIENT_ID),
    vapid: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };

  if (supabase && isSupabaseServiceRoleConfigured()) {
    const { error } = await supabase.from('rsvps').select('id', { head: true, count: 'exact' }).limit(1);
    checks.supabaseRead = !error;
  } else {
    checks.supabaseRead = false;
  }

  const status: HealthCheck['status'] = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    } satisfies HealthCheck,
    { status: status === 'ok' ? 200 : 503 }
  );
}
