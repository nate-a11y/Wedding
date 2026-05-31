import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAdminOperationsReadiness } from '@/lib/admin-operations';
import { supabase, isSupabaseServiceRoleConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const readiness = await getAdminOperationsReadiness();
  let auditEvents: unknown[] = [];

  if (supabase && isSupabaseServiceRoleConfigured()) {
    const { data, error } = await supabase
      .from('admin_audit_events')
      .select('id, action, entity, entity_id, status, details, request_metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (!error) {
      auditEvents = data || [];
    } else {
      readiness.checks.adminAudit = false;
      readiness.status = 'degraded';
      console.error('Admin operations audit fetch error:', error.message);
    }
  } else {
    readiness.checks.adminAudit = false;
    readiness.status = 'degraded';
  }

  if (readiness.checks.adminAudit !== false) readiness.checks.adminAudit = true;

  return NextResponse.json({
    ...readiness,
    auditEvents,
  });
}
