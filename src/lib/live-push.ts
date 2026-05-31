import webpush from 'web-push';
import { supabase } from '@/lib/supabase-server';

type PushSubscriptionRow = {
  id?: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
};

type LivePushInput = {
  message: string;
  type?: string | null;
  url?: string;
  tag?: string;
};

export type LivePushResult = {
  configured: boolean;
  attempted: number;
  sent: number;
  failed: number;
  removed: number;
  error?: string;
};

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let vapidConfigured = false;

function configureVapid() {
  if (!vapidConfigured && vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:nate@nateandblake.wedding',
      vapidPublicKey,
      vapidPrivateKey
    );
    vapidConfigured = true;
  }
}

function iconForType(type?: string | null) {
  if (type === 'celebration') return '🎉';
  if (type === 'action') return '📢';
  if (type === 'alert') return '⚠️';
  return 'ℹ️';
}

export async function sendLivePushNotification({
  message,
  type = 'info',
  url = '/live',
  tag = 'wedding-update',
}: LivePushInput): Promise<LivePushResult> {
  configureVapid();

  if (!supabase || !vapidPublicKey || !vapidPrivateKey) {
    return { configured: false, attempted: 0, sent: 0, failed: 0, removed: 0 };
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth');

  if (error) {
    return { configured: true, attempted: 0, sent: 0, failed: 0, removed: 0, error: error.message };
  }

  const rows = (subscriptions || []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return { configured: true, attempted: 0, sent: 0, failed: 0, removed: 0 };
  }

  const icon = iconForType(type);
  const payload = JSON.stringify({
    title: `${icon} Wedding Update`,
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    data: { url },
  });

  let removed = 0;
  const results = await Promise.allSettled(
    rows.map(async (sub) => {
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
        const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;

        if ((statusCode === 410 || statusCode === 404) && supabase) {
          const { error: deleteError } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          if (!deleteError) removed += 1;
        }
        throw err;
      }
    })
  );

  const sent = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.filter((result) => result.status === 'rejected').length;

  return {
    configured: true,
    attempted: rows.length,
    sent,
    failed,
    removed,
  };
}
