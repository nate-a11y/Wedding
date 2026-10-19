import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedWelcomeAudio, readWelcomeVideoToken } from '@/lib/welcome-video';

export const runtime = 'nodejs';
const schema = z.object({ token: z.string().min(40).max(600) }).strict();
const unavailable = () => NextResponse.json({ error: 'Personalized greeting unavailable. Please enjoy the original film.' }, { status: 503 });

export async function POST(request: NextRequest) {
  try {
    const reader = request.body?.getReader();
    if (!reader) return badRequest('Invalid request');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return badRequest('Invalid request');
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    const parsed = schema.safeParse(JSON.parse(body));
    if (!parsed.success) return badRequest('Invalid request');
    const firstName = readWelcomeVideoToken(parsed.data.token);
    if (!firstName) return NextResponse.json({ error: 'Invalid or expired greeting link' }, { status: 401 });
    if (!process.env.ELEVENLABS_API_KEY) return unavailable();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
    const limits = await Promise.all([
      checkRateLimit(`welcome-ip:${ipHash}`, { windowMs: 60_000, maxRequests: 6 }),
      checkRateLimit(`welcome-token:${tokenHash}`, { windowMs: 60_000, maxRequests: 3 }),
    ]);
    if (limits.some(limit => !limit.allowed)) return NextResponse.json({ error: 'Please try again in a minute.' }, { status: 429 });
    const audio = Buffer.from(await getCachedWelcomeAudio(firstName), 'base64');
    return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    if (error instanceof SyntaxError) return badRequest('Invalid request');
    return unavailable();
  }
}
