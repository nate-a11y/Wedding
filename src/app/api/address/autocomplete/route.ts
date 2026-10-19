import { NextRequest, NextResponse } from 'next/server';
import { addressAutocompleteSchema, parseJsonRequest } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { addressLocationBias, resolveAddress, suggestAddresses } from '@/lib/address-autocomplete';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonRequest(request, addressAutocompleteSchema);
  if (!parsed.success) return parsed.response;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
  const limit = await checkRateLimit(`address-autocomplete:${ip}`, { windowMs: 60000, maxRequests: 30 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests. Enter your address manually.' }, { status: 429 });
  try {
    const body = parsed.data;
    const result = body.action === 'suggest'
      ? { suggestions: await suggestAddresses(body.input, body.sessionToken, addressLocationBias(request.headers)) }
      : { address: await resolveAddress(body.placeId, body.sessionToken) };
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Never log search text or Google's response containing guest address data.
    console.warn('Google address suggestions unavailable');
    return NextResponse.json({ error: 'Suggestions unavailable. Enter your address manually.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
