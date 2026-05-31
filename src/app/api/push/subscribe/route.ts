import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { badRequest, validationErrorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({
      p256dh: z.string().min(20).max(512),
      auth: z.string().min(8).max(256),
    }),
  }),
  guest_email: z.string().email().max(254).toLowerCase().optional().nullable(),
});

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// POST /api/push/subscribe - Register push subscription
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`push-subscribe:${ip}`, {
    windowMs: 60_000,
    maxRequests: 10,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many subscription attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest('Invalid JSON payload');

    const parsed = pushSubscriptionSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { subscription, guest_email } = parsed.data;

    // Upsert subscription (update if endpoint exists, insert otherwise)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          guest_email: guest_email || null,
          user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        },
        {
          onConflict: 'endpoint',
        }
      );

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
