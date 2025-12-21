import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  refreshAccessToken,
  getTodoTasks,
  createTodoTask,
  updateTodoTask,
  deleteTodoTask,
  toMicrosoftTask,
  fromMicrosoftTask,
  createWebhookSubscription,
} from '@/lib/microsoft-graph';

interface MicrosoftAuth {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  todo_list_id: string;
  todo_list_name: string;
  webhook_subscription_id: string | null;
  webhook_expires_at: string | null;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(): Promise<{ token: string; listId: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: auth, error } = await supabase
    .from('microsoft_auth')
    .select('*')
    .single();

  if (error || !auth) return null;

  const msAuth = auth as MicrosoftAuth;
  const expiresAt = new Date(msAuth.expires_at);

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(msAuth.refresh_token);

      await supabase
        .from('microsoft_auth')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', auth.id);

      return { token: newTokens.access_token, listId: msAuth.todo_list_id };
    } catch {
      console.error('Failed to refresh Microsoft token');
      return null;
    }
  }

  return { token: msAuth.access_token, listId: msAuth.todo_list_id };
}

/**
 * POST /api/admin/tasks/sync
 * Sync tasks between local database and Microsoft To Do
 */
export async function POST() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const auth = await getValidAccessToken();

    if (!auth) {
      return NextResponse.json(
        { error: 'Microsoft not connected', connected: false },
        { status: 401 }
      );
    }

    const { token, listId } = auth;

    // Get local tasks
    const { data: localTasks, error: localError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (localError) throw localError;

    // Get Microsoft tasks
    const msTasks = await getTodoTasks(token, listId);

    const syncResults = {
      pushed: 0,
      pulled: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Create a map of Microsoft tasks by ID for quick lookup
    const msTaskMap = new Map(msTasks.map(t => [t.id, t]));
    const localTasksByMsId = new Map(
      localTasks?.filter(t => t.microsoft_todo_id).map(t => [t.microsoft_todo_id, t]) || []
    );

    // 1. Push local tasks that don't exist in Microsoft
    for (const localTask of localTasks || []) {
      if (!localTask.microsoft_todo_id) {
        try {
          const msTask = await createTodoTask(token, listId, toMicrosoftTask(localTask));

          await supabase
            .from('tasks')
            .update({
              microsoft_todo_id: msTask.id,
              microsoft_list_id: listId,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', localTask.id);

          syncResults.pushed++;
        } catch (err) {
          syncResults.errors.push(`Failed to push task "${localTask.title}": ${err}`);
        }
      }
    }

    // 2. Pull Microsoft tasks that don't exist locally
    for (const msTask of msTasks) {
      if (!localTasksByMsId.has(msTask.id)) {
        try {
          const localData = fromMicrosoftTask(msTask);

          await supabase
            .from('tasks')
            .insert({
              ...localData,
              microsoft_todo_id: msTask.id,
              microsoft_list_id: listId,
              last_synced_at: new Date().toISOString(),
            });

          syncResults.pulled++;
        } catch (err) {
          syncResults.errors.push(`Failed to pull task "${msTask.title}": ${err}`);
        }
      }
    }

    // 3. Sync updates for tasks that exist in both places
    // Use last_synced_at to determine which version is newer
    for (const localTask of localTasks || []) {
      if (localTask.microsoft_todo_id && msTaskMap.has(localTask.microsoft_todo_id)) {
        const msTask = msTaskMap.get(localTask.microsoft_todo_id)!;
        const localUpdated = new Date(localTask.updated_at);
        const lastSynced = localTask.last_synced_at ? new Date(localTask.last_synced_at) : new Date(0);

        // If local was updated after last sync, push to Microsoft
        if (localUpdated > lastSynced) {
          try {
            await updateTodoTask(token, listId, localTask.microsoft_todo_id, toMicrosoftTask(localTask));

            await supabase
              .from('tasks')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('id', localTask.id);

            syncResults.updated++;
          } catch (err) {
            syncResults.errors.push(`Failed to update task "${localTask.title}": ${err}`);
          }
        } else {
          // Microsoft version might be newer - update local
          const msData = fromMicrosoftTask(msTask);

          // Only update if there are actual differences
          if (msData.completed !== localTask.completed ||
              msData.title !== localTask.title ||
              msData.due_date !== localTask.due_date) {
            try {
              await supabase
                .from('tasks')
                .update({
                  ...msData,
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', localTask.id);

              syncResults.updated++;
            } catch (err) {
              syncResults.errors.push(`Failed to update local task "${localTask.title}": ${err}`);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      results: syncResults,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tasks/sync
 * Check Microsoft connection status
 */
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ connected: false, reason: 'db_not_configured' });
  }

  try {
    const auth = await getValidAccessToken();

    if (!auth) {
      return NextResponse.json({ connected: false, reason: 'not_authenticated' });
    }

    // Get list info
    const { data } = await supabase
      .from('microsoft_auth')
      .select('todo_list_name, webhook_subscription_id, webhook_expires_at')
      .single();

    return NextResponse.json({
      connected: true,
      listName: data?.todo_list_name || 'Wedding Planning',
      webhookActive: !!data?.webhook_subscription_id,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ connected: false, reason: 'error' });
  }
}

/**
 * DELETE /api/admin/tasks/sync
 * Disconnect Microsoft integration
 */
export async function DELETE() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Delete the auth record
    await supabase
      .from('microsoft_auth')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Clear Microsoft IDs from tasks
    await supabase
      .from('tasks')
      .update({
        microsoft_todo_id: null,
        microsoft_list_id: null,
        last_synced_at: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tasks/sync
 * Setup or renew webhook subscription
 */
export async function PUT() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const auth = await getValidAccessToken();

    if (!auth) {
      return NextResponse.json(
        { error: 'Microsoft not connected' },
        { status: 401 }
      );
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nateandblake.me'}/api/webhooks/microsoft`;

    const subscription = await createWebhookSubscription(
      auth.token,
      auth.listId,
      webhookUrl
    );

    await supabase
      .from('microsoft_auth')
      .update({
        webhook_subscription_id: subscription.id,
        webhook_expires_at: subscription.expirationDateTime,
      })
      .single();

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      expiresAt: subscription.expirationDateTime,
    });
  } catch (error) {
    console.error('Webhook setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhook', details: String(error) },
      { status: 500 }
    );
  }
}
