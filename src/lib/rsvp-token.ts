import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CORE_RSVP_EVENTS = ['ceremony', 'cocktail', 'reception', 'sendoff'] as const;

const RSVP_TOKEN_BYTES = 32;
const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 128;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
const DEFAULT_TOKEN_EXPIRES_AT = '2027-11-15T23:59:59.000Z';

interface RsvpTokenRow {
  id: string;
  rsvp_id: string | null;
  email: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface RsvpEditTokenContext {
  id: string;
  rsvpId: string | null;
  email: string;
  expiresAt: string;
}

export interface CreatedRsvpEditToken {
  token: string;
  editUrl: string;
  expiresAt: string;
}

export function normalizeRsvpEditToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;

  const normalized = token.trim();
  if (
    normalized.length < MIN_TOKEN_LENGTH ||
    normalized.length > MAX_TOKEN_LENGTH ||
    !TOKEN_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function generateRsvpEditToken(): string {
  return randomBytes(RSVP_TOKEN_BYTES).toString('base64url');
}

export function hashRsvpEditToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function buildRsvpEditUrl(origin: string, token: string): string {
  const url = new URL('/rsvp', origin);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function getRsvpEditTokenContext(
  client: SupabaseClient,
  token: unknown
): Promise<RsvpEditTokenContext | null> {
  const normalized = normalizeRsvpEditToken(token);
  if (!normalized) return null;

  const tokenHash = hashRsvpEditToken(normalized);
  const { data, error } = await client
    .from('rsvp_edit_tokens')
    .select('id, rsvp_id, email, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('RSVP token lookup error:', error);
    return null;
  }

  const row = data as RsvpTokenRow | null;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  await client
    .from('rsvp_edit_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  return {
    id: row.id,
    rsvpId: row.rsvp_id,
    email: row.email.toLowerCase(),
    expiresAt: row.expires_at,
  };
}

export async function createRsvpEditToken(
  client: SupabaseClient,
  params: { rsvpId: string | null; email: string; origin: string }
): Promise<CreatedRsvpEditToken | null> {
  const email = params.email.trim().toLowerCase();
  const expiresAt = DEFAULT_TOKEN_EXPIRES_AT;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateRsvpEditToken();
    const tokenHash = hashRsvpEditToken(token);
    const tokenHint = token.slice(-6);

    const { error } = await client.from('rsvp_edit_tokens').insert({
      rsvp_id: params.rsvpId,
      email,
      token_hash: tokenHash,
      token_hint: tokenHint,
      expires_at: expiresAt,
      created_by: 'rsvp_api',
    });

    if (!error) {
      return {
        token,
        editUrl: buildRsvpEditUrl(params.origin, token),
        expiresAt,
      };
    }

    // 23505 = unique_violation. Retry token collisions; otherwise fail softly.
    if (error.code !== '23505') {
      console.error('RSVP token creation error:', error);
      return null;
    }
  }

  console.error('RSVP token creation failed after repeated token collisions');
  return null;
}

export async function attachRsvpEditTokenToRsvp(
  client: SupabaseClient,
  tokenId: string,
  rsvpId: string
): Promise<void> {
  const { error } = await client
    .from('rsvp_edit_tokens')
    .update({ rsvp_id: rsvpId })
    .eq('id', tokenId)
    .is('rsvp_id', null);

  if (error) {
    console.error('RSVP token attach error:', error);
  }
}

export async function getInvitedRsvpEvents(
  client: SupabaseClient,
  email: string
): Promise<string[]> {
  const invitedEvents: string[] = [...CORE_RSVP_EVENTS];

  const { data, error } = await client
    .from('guest_events')
    .select('event_slug')
    .eq('email', email.trim().toLowerCase());

  if (error) {
    console.error('RSVP event invitation lookup error:', error);
    return invitedEvents;
  }

  for (const invite of data || []) {
    if (typeof invite.event_slug === 'string' && !invitedEvents.includes(invite.event_slug)) {
      invitedEvents.push(invite.event_slug);
    }
  }

  return invitedEvents;
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'•'.repeat(Math.max(1, Math.min(4, localPart.length - visible.length)))}@${domain}`;
}
