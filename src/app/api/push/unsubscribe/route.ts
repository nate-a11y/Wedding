import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { badRequest, validationErrorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// POST /api/push/unsubscribe - Remove push subscription
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`push-unsubscribe:${ip}`, {
    windowMs: 60_000,
    maxRequests: 20,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many unsubscribe attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest('Invalid JSON payload');

    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { endpoint } = parsed.data;

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
