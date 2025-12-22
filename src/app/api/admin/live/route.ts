import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:nate@nateandblake.wedding',
    vapidPublicKey,
    vapidPrivateKey
  );
}

// GET /api/admin/live - Get all updates with subscriber count
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ updates: [], subscriberCount: 0 });
  }

  try {
    const [updatesResult, subscribersResult] = await Promise.all([
      supabase
        .from('live_updates')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact' }),
    ]);

    if (updatesResult.error) throw updatesResult.error;

    return NextResponse.json({
      updates: updatesResult.data || [],
      subscriberCount: subscribersResult.count || 0,
    });
  } catch (error) {
    console.error('Admin live updates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/live - Post new update
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { message, type = 'info', posted_by, pinned = false, send_push = true } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Insert the update
    const { data: update, error } = await supabase
      .from('live_updates')
      .insert({
        message: message.trim(),
        type,
        posted_by,
        pinned,
      })
      .select()
      .single();

    if (error) throw error;

    // Send push notifications if enabled
    if (send_push && vapidPublicKey && vapidPrivateKey) {
      await sendPushNotifications(message.trim(), type);
    }

    return NextResponse.json({
      success: true,
      update,
    });
  } catch (error) {
    console.error('Post live update error:', error);
    return NextResponse.json(
      { error: 'Failed to post update' },
      { status: 500 }
    );
  }
}

// Helper to send push notifications to all subscribers
async function sendPushNotifications(message: string, type: string) {
  if (!supabase) return;

  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (!subscriptions || subscriptions.length === 0) return;

    const icon = type === 'celebration' ? '🎉' : type === 'action' ? '📢' : 'ℹ️';
    const payload = JSON.stringify({
      title: `${icon} Wedding Update`,
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'wedding-update',
      data: {
        url: '/live',
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys_p256dh,
                auth: sub.keys_auth,
              },
            },
            payload
          );
        } catch (err: unknown) {
          // If subscription is invalid, remove it
          const error = err as { statusCode?: number };
          if ((error.statusCode === 410 || error.statusCode === 404) && supabase) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`Push notifications: ${sent} sent, ${failed} failed`);
  } catch (error) {
    console.error('Push notification error:', error);
  }
}
