import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { addressValidationSchema, parseJsonRequest } from '@/lib/validation';
import { validateGoogleAddress } from '@/lib/address-validation';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonRequest(request, addressValidationSchema);
  if (!parsed.success) return parsed.response;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
  const limit = await checkRateLimit(`address-validation:${ip}`, { windowMs: 60000, maxRequests: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const result = await validateGoogleAddress(parsed.data);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Google address validation unavailable');
    return NextResponse.json(
      { error: 'Address validation is temporarily unavailable.', validation_unavailable: true },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
