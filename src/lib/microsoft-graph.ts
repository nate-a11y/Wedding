/**
 * Microsoft Graph API utilities for To Do integration
 */

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://nateandblake.me/api/auth/microsoft/callback'
  : 'http://localhost:3000/api/auth/microsoft/callback';

const SCOPES = ['Tasks.ReadWrite', 'User.Read', 'offline_access'];

export interface MicrosoftTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: Date;
}

export interface TodoList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName?: string;
}

export interface TodoTask {
  id?: string;
  title: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  importance: 'low' | 'normal' | 'high';
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  completedDateTime?: {
    dateTime: string;
    timeZone: string;
  };
}

/**
 * Generate the OAuth authorization URL
 */
export function getAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    response_mode: 'query',
    ...(state && { state }),
  });

  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
  const response = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const tokens = await response.json();
  return {
    ...tokens,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  const response = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const tokens = await response.json();
  return {
    ...tokens,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

/**
 * Make authenticated request to Graph API
 */
async function graphRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Get all To Do lists
 */
export async function getTodoLists(accessToken: string): Promise<TodoList[]> {
  const result = await graphRequest<{ value: TodoList[] }>(
    accessToken,
    '/me/todo/lists'
  );
  return result.value;
}

/**
 * Create a new To Do list
 */
export async function createTodoList(accessToken: string, displayName: string): Promise<TodoList> {
  return graphRequest<TodoList>(accessToken, '/me/todo/lists', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

/**
 * Get all tasks from a list
 */
export async function getTodoTasks(accessToken: string, listId: string): Promise<TodoTask[]> {
  const result = await graphRequest<{ value: TodoTask[] }>(
    accessToken,
    `/me/todo/lists/${listId}/tasks`
  );
  return result.value;
}

/**
 * Create a task in a list
 */
export async function createTodoTask(
  accessToken: string,
  listId: string,
  task: Omit<TodoTask, 'id'>
): Promise<TodoTask> {
  return graphRequest<TodoTask>(
    accessToken,
    `/me/todo/lists/${listId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify(task),
    }
  );
}

/**
 * Update a task
 */
export async function updateTodoTask(
  accessToken: string,
  listId: string,
  taskId: string,
  updates: Partial<TodoTask>
): Promise<TodoTask> {
  return graphRequest<TodoTask>(
    accessToken,
    `/me/todo/lists/${listId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Delete a task
 */
export async function deleteTodoTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  await graphRequest<void>(
    accessToken,
    `/me/todo/lists/${listId}/tasks/${taskId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Create a webhook subscription for task changes
 */
export async function createWebhookSubscription(
  accessToken: string,
  listId: string,
  webhookUrl: string
): Promise<{ id: string; expirationDateTime: string }> {
  // Subscriptions expire after max 4230 minutes (~3 days) for To Do
  const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  return graphRequest(accessToken, '/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: `/me/todo/lists/${listId}/tasks`,
      expirationDateTime,
      clientState: process.env.MICROSOFT_WEBHOOK_SECRET || 'weddingPlannerSecret',
    }),
  });
}

/**
 * Renew a webhook subscription
 */
export async function renewWebhookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<{ id: string; expirationDateTime: string }> {
  const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  return graphRequest(accessToken, `/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ expirationDateTime }),
  });
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  await graphRequest<void>(accessToken, `/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

/**
 * Convert local task to Microsoft To Do format
 */
export function toMicrosoftTask(task: {
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed?: boolean;
  priority?: string;
}): Omit<TodoTask, 'id'> {
  const msTask: Omit<TodoTask, 'id'> = {
    title: task.title,
    status: task.completed ? 'completed' : 'notStarted',
    importance: task.priority === 'high' || task.priority === 'urgent' ? 'high' :
                task.priority === 'low' ? 'low' : 'normal',
  };

  if (task.description) {
    msTask.body = {
      content: task.description,
      contentType: 'text',
    };
  }

  if (task.due_date) {
    msTask.dueDateTime = {
      dateTime: `${task.due_date}T00:00:00`,
      timeZone: 'UTC',
    };
  }

  return msTask;
}

/**
 * Convert Microsoft To Do task to local format
 */
export function fromMicrosoftTask(msTask: TodoTask): {
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  priority: string;
  completed_date: string | null;
} {
  return {
    title: msTask.title,
    description: msTask.body?.content || null,
    due_date: msTask.dueDateTime?.dateTime?.split('T')[0] || null,
    completed: msTask.status === 'completed',
    priority: msTask.importance === 'high' ? 'high' :
              msTask.importance === 'low' ? 'low' : 'medium',
    completed_date: msTask.completedDateTime?.dateTime?.split('T')[0] || null,
  };
}
