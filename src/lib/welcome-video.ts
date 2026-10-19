import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { unstable_cache } from 'next/cache';

export const WELCOME_VIDEO_URL = 'https://www.nateandblake.me/welcome';
export const WELCOME_VIDEO_VOICE = 'iP95p4xoKVk53GoZ742B';
export const WELCOME_VIDEO_MODEL = 'eleven_v4';
const TOKEN_EXPIRY = Date.parse('2027-12-01T00:00:00Z');
const MAX_AUDIO_BYTES = 512 * 1024;
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*$/u;

function tokenKey(): Buffer | null {
  const secret = process.env.WELCOME_VIDEO_TOKEN_SECRET;
  return secret && secret.trim().length >= 32 ? createHash('sha256').update(secret).digest() : null;
}

function validFirstName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 60 && NAME_PATTERN.test(value);
}

/** Full names are reduced to the first word; hyphenated first names stay intact. */
export function getWelcomeVideoUrl(name: string): string {
  const key = tokenKey();
  if (!key || name.length > 200 || /[\p{Cc}\p{Cf}]/u.test(name) || Date.now() >= TOKEN_EXPIRY) return WELCOME_VIDEO_URL;
  const firstName = name.normalize('NFC').trim().split(/\s+/u)[0];
  if (!validFirstName(firstName)) return WELCOME_VIDEO_URL;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('wedding-welcome-v1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ firstName, expiresAt: TOKEN_EXPIRY }), 'utf8'), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  return `${WELCOME_VIDEO_URL}?token=${token}`;
}

export function readWelcomeVideoToken(token: unknown): string | null {
  const key = tokenKey();
  if (!key || typeof token !== 'string' || token.length < 40 || token.length > 600 || !/^[\w-]+$/.test(token)) return null;
  try {
    const data = Buffer.from(token, 'base64url');
    if (data.toString('base64url') !== token) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
    decipher.setAAD(Buffer.from('wedding-welcome-v1'));
    decipher.setAuthTag(data.subarray(12, 28));
    const payload: unknown = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    const { firstName, expiresAt } = payload as Record<string, unknown>;
    return validFirstName(firstName) && typeof expiresAt === 'number' && Number.isFinite(expiresAt) && expiresAt > Date.now() && expiresAt <= TOKEN_EXPIRY ? firstName : null;
  } catch {
    return null;
  }
}

/** Only called after a verified token and an explicit guest Play action. */
export async function generateWelcomeAudio(firstName: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !validFirstName(firstName)) throw new Error('Welcome audio unavailable');
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${WELCOME_VIDEO_VOICE}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: `${firstName}, a little hello from us.`, model_id: WELCOME_VIDEO_MODEL }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('audio/mpeg') || !response.body) {
      await response.body?.cancel();
      throw new Error('Welcome audio unavailable');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) {
        await reader.cancel();
        throw new Error('Welcome audio unavailable');
      }
      chunks.push(value);
    }
    if (!size) throw new Error('Welcome audio unavailable');
    return Buffer.concat(chunks).toString('base64');
  } catch {
    // Provider errors can contain request data; never propagate them into logs.
    throw new Error('Welcome audio unavailable');
  }
}

export const getCachedWelcomeAudio = unstable_cache(generateWelcomeAudio, ['wedding-welcome-greeting-v2', WELCOME_VIDEO_VOICE, WELCOME_VIDEO_MODEL], { revalidate: false });
