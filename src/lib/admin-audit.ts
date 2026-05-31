import { NextRequest } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';

export type AdminAuditStatus = 'success' | 'failure';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type AdminAuditDetails = Record<string, JsonValue | undefined>;

export interface AdminAuditEventInput {
  request: NextRequest;
  action: string;
  entity: string;
  entityId?: string | number | null;
  status: AdminAuditStatus;
  details?: AdminAuditDetails;
}

function cleanDetails(details: AdminAuditDetails = {}): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(details).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined)
  );
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    null
  );
}

function getRequestMetadata(request: NextRequest): Record<string, JsonValue> {
  const requestId =
    request.headers.get('x-request-id') ||
    request.headers.get('x-vercel-id') ||
    request.headers.get('cf-ray');

  return cleanDetails({
    method: request.method,
    path: request.nextUrl.pathname,
    ip: getClientIp(request),
    user_agent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin'),
    request_id: requestId,
  });
}

/**
 * Best-effort audit logging for authenticated admin mutations.
 *
 * This helper intentionally never throws so route responses are not changed by
 * audit table availability, RLS, or transient Supabase failures.
 */
export async function logAdminAuditEvent({
  request,
  action,
  entity,
  entityId,
  status,
  details,
}: AdminAuditEventInput): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const { error } = await supabase.from('admin_audit_events').insert({
      action,
      entity,
      entity_id: entityId === undefined || entityId === null ? null : String(entityId),
      status,
      details: cleanDetails(details),
      request_metadata: getRequestMetadata(request),
    });

    if (error) {
      console.warn('Admin audit log insert failed:', error.message);
    }
  } catch (error) {
    console.warn('Admin audit log insert failed:', error);
  }
}

export function getAuditErrorDetails(error: unknown): Record<string, JsonValue> {
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
