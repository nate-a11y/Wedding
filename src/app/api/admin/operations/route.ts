import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { isSupabaseServiceRoleConfigured, supabase } from '@/lib/supabase-server';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const checks: Record<string, boolean> = {
    sitePassword: Boolean(process.env.SITE_PASSWORD || process.env.GUEST_PASSWORD),
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
    authSessionSecret: Boolean(process.env.AUTH_SESSION_SECRET || process.env.WEDDING_AUTH_SESSION_SECRET),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRole: isSupabaseServiceRoleConfigured(),
    emailProvider: Boolean(process.env.RESEND_API_KEY || process.env.MICROSOFT_CLIENT_ID),
    vapid: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };

  let auditEvents: unknown[] = [];

  if (supabase && isSupabaseServiceRoleConfigured()) {
    const { error: readError } = await supabase
      .from('rsvps')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    checks.supabaseRead = !readError;

    const { data: weddingBucket } = await supabase.storage.getBucket('wedding');
    checks.weddingBucket = Boolean(weddingBucket);

    const { data: guestbookBucket } = await supabase.storage.getBucket('guestbook-media');
    checks.guestbookMediaBucket = Boolean(guestbookBucket);

    const { data, error } = await supabase
      .from('admin_audit_events')
      .select('id, action, entity, entity_id, status, details, request_metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (!error) {
      auditEvents = data || [];
    } else {
      checks.adminAudit = false;
      console.error('Admin operations audit fetch error:', error);
    }
  } else {
    checks.supabaseRead = false;
    checks.weddingBucket = false;
    checks.guestbookMediaBucket = false;
    checks.adminAudit = false;
  }

  if (checks.adminAudit !== false) checks.adminAudit = true;

  const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks,
    auditEvents,
  });
}
