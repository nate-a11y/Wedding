import { supabase } from '@/lib/supabase-server';
import { sendLivePushNotification, type LivePushResult } from '@/lib/live-push';

type DueLiveUpdate = {
  id: string;
  message: string;
  type: string | null;
  scheduled_for: string | null;
};

export type ScheduledLiveRunResult = {
  ok: boolean;
  due: number;
  processed: number;
  sent: number;
  failed: number;
  removedSubscriptions: number;
  errors: Array<{ id: string; error: string }>;
};

function resultError(result: LivePushResult) {
  if (result.error) return result.error;
  if (!result.configured) return 'Push is not configured';
  if (result.failed > 0) return `${result.failed} push notification(s) failed`;
  return null;
}

export async function runDueScheduledLiveUpdates(limit = 25): Promise<ScheduledLiveRunResult> {
  if (!supabase) {
    return { ok: false, due: 0, processed: 0, sent: 0, failed: 0, removedSubscriptions: 0, errors: [{ id: 'supabase', error: 'Database not configured' }] };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('live_updates')
    .select('id, message, type, scheduled_for')
    .eq('push_requested', true)
    .is('push_sent_at', null)
    .is('deleted_at', null)
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false, due: 0, processed: 0, sent: 0, failed: 0, removedSubscriptions: 0, errors: [{ id: 'query', error: error.message }] };
  }

  const updates = (data || []) as DueLiveUpdate[];
  const summary: ScheduledLiveRunResult = {
    ok: true,
    due: updates.length,
    processed: 0,
    sent: 0,
    failed: 0,
    removedSubscriptions: 0,
    errors: [],
  };

  for (const update of updates) {
    try {
      const pushResult = await sendLivePushNotification({
        message: update.message,
        type: update.type || 'info',
      });
      const errorMessage = resultError(pushResult);
      const status = errorMessage ? 'failed' : 'sent';

      const { error: updateError } = await supabase
        .from('live_updates')
        .update({
          push_sent_at: status === 'sent' ? new Date().toISOString() : null,
          push_status: status,
          push_error: errorMessage,
        })
        .eq('id', update.id);

      if (updateError) throw updateError;

      summary.processed += 1;
      summary.sent += pushResult.sent;
      summary.failed += pushResult.failed;
      summary.removedSubscriptions += pushResult.removed;

      if (errorMessage) {
        summary.ok = false;
        summary.errors.push({ id: update.id, error: errorMessage });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown scheduled push error';
      summary.ok = false;
      summary.failed += 1;
      summary.errors.push({ id: update.id, error: message });
      await supabase
        .from('live_updates')
        .update({ push_status: 'failed', push_error: message })
        .eq('id', update.id);
    }
  }

  return summary;
}
