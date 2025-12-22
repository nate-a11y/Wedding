import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// POST /api/push/subscribe - Register push subscription
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { subscription, guest_email } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }

    // Upsert subscription (update if endpoint exists, insert otherwise)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          guest_email: guest_email || null,
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
