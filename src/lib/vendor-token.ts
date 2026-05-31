import { createHash, randomBytes } from 'crypto';

const VENDOR_TOKEN_BYTES = 32;
const VENDOR_TOKEN_STORAGE_PREFIX = 'sha256:';

export function createVendorPortalToken(): string {
  return randomBytes(VENDOR_TOKEN_BYTES).toString('hex');
}

export function hashVendorPortalToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function getVendorTokenStorageValue(tokenHash: string): string {
  return `${VENDOR_TOKEN_STORAGE_PREFIX}${tokenHash}`;
}

export function getVendorTokenPreview(token: string): string {
  if (token.length <= 12) return 'created-only';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

export function isLikelyVendorPortalToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}
