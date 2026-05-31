export type AuthSessionRole = 'guest' | 'admin';

export const AUTH_COOKIE_NAMES: Record<AuthSessionRole, string> = {
  guest: 'wedding-guest-auth',
  admin: 'wedding-admin-auth',
};

interface AuthSessionPayload {
  version: 1;
  role: AuthSessionRole;
  exp: number;
  nonce: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64UrlDecodeText(value: string): string {
  return decoder.decode(base64UrlDecodeBytes(value));
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length, 1);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export function getAuthSessionSecret(role: AuthSessionRole): string | undefined {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.WEDDING_AUTH_SESSION_SECRET ||
    (role === 'admin'
      ? process.env.ADMIN_PASSWORD
      : process.env.SITE_PASSWORD || process.env.GUEST_PASSWORD)
  );
}

export function secureStringEquals(left: string, right: string): boolean {
  return constantTimeEqual(left, right);
}

export async function createAuthSession(
  role: AuthSessionRole,
  secret: string,
  maxAgeSeconds: number
): Promise<string> {
  const payload: AuthSessionPayload = {
    version: 1,
    role,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAuthSession(
  value: string | undefined,
  role: AuthSessionRole,
  secret: string | undefined
): Promise<boolean> {
  if (!value || !secret) return false;

  const [payload, signature, ...extra] = value.split('.');
  if (!payload || !signature || extra.length > 0) return false;

  const expectedSignature = await signPayload(payload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) return false;

  try {
    const parsed = JSON.parse(base64UrlDecodeText(payload)) as Partial<AuthSessionPayload>;
    return (
      parsed.version === 1 &&
      parsed.role === role &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
