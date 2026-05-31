import { supabase } from '@/lib/supabase-server';
import {
  getVendorTokenPreview,
  getVendorTokenStorageValue,
  hashVendorPortalToken,
  isLikelyVendorPortalToken,
} from '@/lib/vendor-token';

export type VendorPortalTokenRow = {
  id: string;
  token?: string | null;
  token_hash?: string | null;
  token_preview?: string | null;
  vendor_id: string | null;
  vendor_name: string;
  role: string;
  expires_at: string;
  last_accessed?: string | null;
  last_used_at?: string | null;
  access_count?: number | null;
  revoked_at?: string | null;
  checked_in_at?: string | null;
  check_in_note?: string | null;
};

async function findVendorToken(rawToken: string): Promise<{ tokenData: VendorPortalTokenRow | null; legacyPlaintext: boolean }> {
  if (!supabase) return { tokenData: null, legacyPlaintext: false };

  const tokenHash = hashVendorPortalToken(rawToken);

  const { data: hashedToken, error: hashedError } = await supabase
    .from('vendor_portal_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (hashedError) throw hashedError;
  if (hashedToken) return { tokenData: hashedToken as VendorPortalTokenRow, legacyPlaintext: false };

  const { data: legacyToken, error: legacyError } = await supabase
    .from('vendor_portal_tokens')
    .select('*')
    .eq('token', rawToken)
    .maybeSingle();

  if (legacyError) throw legacyError;
  return {
    tokenData: legacyToken as VendorPortalTokenRow | null,
    legacyPlaintext: Boolean(legacyToken),
  };
}

export async function validateVendorPortalToken(rawToken: string, touch = true): Promise<VendorPortalTokenRow> {
  if (!isLikelyVendorPortalToken(rawToken)) {
    throw new Error('Invalid or expired access link');
  }

  const { tokenData, legacyPlaintext } = await findVendorToken(rawToken);
  if (!tokenData) throw new Error('Invalid or expired access link');
  if (tokenData.revoked_at) throw new Error('Access link has been revoked');
  if (new Date(tokenData.expires_at) < new Date()) throw new Error('Access link has expired');

  if (touch && supabase) {
    const now = new Date().toISOString();
    const tokenHash = hashVendorPortalToken(rawToken);
    const accessCount = typeof tokenData.access_count === 'number' ? tokenData.access_count + 1 : 1;
    const updatePayload: Record<string, string | number | null> = {
      last_accessed: now,
      last_used_at: now,
      access_count: accessCount,
    };

    if (legacyPlaintext) {
      updatePayload.token_hash = tokenHash;
      updatePayload.token = getVendorTokenStorageValue(tokenHash);
      updatePayload.token_preview = getVendorTokenPreview(rawToken);
      updatePayload.legacy_plaintext_migrated_at = now;
    }

    const { error } = await supabase
      .from('vendor_portal_tokens')
      .update(updatePayload)
      .eq('id', tokenData.id);

    if (error) throw error;
  }

  return tokenData;
}
