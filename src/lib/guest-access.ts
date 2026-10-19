import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_COOKIE_NAMES, getAuthSessionSecret, readAuthSession } from '@/lib/auth-session';
import { generateRsvpEditToken, hashRsvpEditToken } from '@/lib/rsvp-token';

export const GUEST_SESSION_SECONDS = 30 * 24 * 60 * 60;
const LINK_LIFETIME_MS = 15 * 60 * 1000;

export async function getVerifiedGuestEmail(request: NextRequest): Promise<string | null> {
  const session = await readAuthSession(request.cookies.get(AUTH_COOKIE_NAMES.guest)?.value, 'guest', getAuthSessionSecret('guest'));
  return typeof session?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(session.email) ? session.email : null;
}

export async function isKnownGuest(client: SupabaseClient, email: string): Promise<boolean> {
  const results = await Promise.all(['guest_addresses', 'rsvps', 'guest_events'].map(table =>
    client.from(table).select('email').eq('email', email).limit(1)
  ));
  if (results.some(result => result.error)) throw new Error('Guest lookup unavailable');
  return results.some(result => result.data?.length);
}

export async function createGuestSignInToken(client: SupabaseClient, email: string): Promise<string> {
  const token = generateRsvpEditToken();
  const { error } = await client.from('rsvp_edit_tokens').insert({
    email, token_hash: hashRsvpEditToken(token), created_by: 'guest_sign_in',
    expires_at: new Date(Date.now() + LINK_LIFETIME_MS).toISOString(),
  });
  if (error) throw new Error('Guest sign-in unavailable');
  return token;
}

export async function consumeGuestSignInToken(client: SupabaseClient, token: string): Promise<string | null> {
  const now = new Date().toISOString();
  // Atomically consume only this purpose's live token; scanners cannot consume a GET link.
  const { data, error } = await client.from('rsvp_edit_tokens')
    .update({ revoked_at: now, last_used_at: now })
    .eq('token_hash', hashRsvpEditToken(token)).eq('created_by', 'guest_sign_in')
    .is('revoked_at', null).gt('expires_at', now).select('email').maybeSingle();
  if (error) throw new Error('Guest sign-in unavailable');
  return data?.email || null;
}
