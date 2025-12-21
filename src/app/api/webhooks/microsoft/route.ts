import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  refreshAccessToken,
  getTodoTasks,
  fromMicrosoftTask,
} from '@/lib/microsoft-graph';

const WEBHOOK_SECRET = process.env.MICROSOFT_WEBHOOK_SECRET || 'weddingPlannerSecret';

interface MicrosoftAuth {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  todo_list_id: string;
}

interface ChangeNotification {
  changeType: 'created' | 'updated' | 'deleted';
  clientState: string;
  resource: string;
  resourceData?: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
  };
  subscriptionId: string;
  tenantId: string;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(): Promise<{ token: string; listId: string; authId: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data: auth, error } = await supabase
    .from('microsoft_auth')
    .select('*')
    .single();

  if (error || !auth) return null;

  const msAuth = auth as MicrosoftAuth;
  const expiresAt = new Date(msAuth.expires_at);

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

      return { token: newTokens.access_token, listId: msAuth.todo_list_id, authId: msAuth.id };
    } catch {
      return null;
    }
  }

  return { token: msAuth.access_token, listId: msAuth.todo_list_id, authId: msAuth.id };
}

/**
 * POST /api/webhooks/microsoft
 * Handles webhook notifications from Microsoft Graph
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Handle validation request from Microsoft
    const validationToken = url.searchParams.get('validationToken');
    if (validationToken) {
      // Microsoft sends this when setting up the webhook
      // We must return it as plain text
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Parse notification payload
    const body = await request.json();
    const notifications = body.value as ChangeNotification[];

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Validate client state to ensure notification is from our subscription
    for (const notification of notifications) {
      if (notification.clientState !== WEBHOOK_SECRET) {
        console.warn('Invalid client state in webhook notification');
        continue;
      }

      // Process the notification
      await processNotification(notification);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Microsoft from retrying
    return NextResponse.json({ success: false, error: String(error) });
  }
}

/**
 * Process a single change notification
 */
async function processNotification(notification: ChangeNotification): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const auth = await getValidAccessToken();
  if (!auth) return;

  // Extract task ID from resource path
  // Resource looks like: "me/todo/lists/{listId}/tasks/{taskId}"
  const resourceParts = notification.resource.split('/');
  const taskId = resourceParts[resourceParts.length - 1];

  if (notification.changeType === 'deleted') {
    // Mark task as deleted or remove Microsoft link
    await supabase
      .from('tasks')
      .update({
        microsoft_todo_id: null,
        microsoft_list_id: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('microsoft_todo_id', taskId);
    return;
  }

  // For created/updated, fetch the task from Microsoft
  const msTasks = await getTodoTasks(auth.token, auth.listId);
  const msTask = msTasks.find(t => t.id === taskId);

  if (!msTask) return;

  const localData = fromMicrosoftTask(msTask);

  if (notification.changeType === 'created') {
    // Check if we already have this task (might have been created from our side)
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('microsoft_todo_id', taskId)
      .single();

    if (!existing) {
      // Create new local task
      await supabase
        .from('tasks')
        .insert({
          ...localData,
          microsoft_todo_id: taskId,
          microsoft_list_id: auth.listId,
          last_synced_at: new Date().toISOString(),
        });
    }
  } else if (notification.changeType === 'updated') {
    // Update existing local task
    await supabase
      .from('tasks')
      .update({
        ...localData,
        last_synced_at: new Date().toISOString(),
      })
      .eq('microsoft_todo_id', taskId);
  }
}
