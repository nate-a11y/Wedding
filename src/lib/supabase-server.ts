import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serverSupabaseKey = supabaseServiceRoleKey || (process.env.NODE_ENV !== 'production' ? supabaseAnonKey : undefined);

if (!supabaseUrl || !serverSupabaseKey) {
  console.warn('Supabase server credentials not found. Database functionality will be disabled.');
}

/**
 * Server-only Supabase client.
 *
 * Production route handlers require SUPABASE_SERVICE_ROLE_KEY so database RLS
 * can stay locked down to service_role while public writes go through
 * validated APIs. Local dev can fall back to the anon key for builds/demos.
 */
export const supabase = supabaseUrl && serverSupabaseKey
  ? createClient(supabaseUrl, serverSupabaseKey, {
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
