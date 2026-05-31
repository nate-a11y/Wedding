import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
  console.warn('Supabase server credentials not found. Database functionality will be disabled.');
}

/**
 * Server-only Supabase client.
 *
 * Prefer SUPABASE_SERVICE_ROLE_KEY on route handlers so database RLS can be
 * locked down to service_role while public writes go through validated APIs.
 * Falls back to anon key locally so build/dev still works without secrets.
 */
export const supabase = supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}
