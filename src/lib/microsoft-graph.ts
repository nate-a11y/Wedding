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

const SCOPES = ['Tasks.ReadWrite', 'User.Read', 'Mail.Send', 'Mail.Read', 'offline_access'];

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
    console.error('Graph API error details:', {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      error: JSON.stringify(error, null, 2),
    });
    throw new Error(`Graph API error (${response.status}): ${error.error?.message || error.error?.code || response.statusText}`);
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

// =====================================================
// EMAIL FUNCTIONS (using Mail.Send permission)
// =====================================================

export interface EmailMessage {
  subject: string;
  body: {
    contentType: 'Text' | 'HTML';
    content: string;
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  replyTo?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  // Receipt tracking - request delivery and read confirmations
  isDeliveryReceiptRequested?: boolean;
  isReadReceiptRequested?: boolean;
}

/**
 * Send an email using Microsoft Graph API
 * Emails are sent from the authenticated user's account (nateandblakesayido@outlook.com)
 * Requests delivery and read receipts for tracking
 */
export async function sendEmail(
  accessToken: string,
  options: {
    to: string[];
    subject: string;
    html: string;
    replyTo?: string;
    saveToSent?: boolean;
    requestReceipts?: boolean;
  }
): Promise<void> {
  const message: EmailMessage = {
    subject: options.subject,
    body: {
      contentType: 'HTML',
      content: options.html,
    },
    toRecipients: options.to.map(email => ({
      emailAddress: { address: email },
    })),
  };

  // Only add receipt requests if explicitly enabled (not supported on consumer Outlook.com accounts)
  if (options.requestReceipts === true) {
    message.isDeliveryReceiptRequested = true;
    message.isReadReceiptRequested = true;
  }

  if (options.replyTo) {
    message.replyTo = [{
      emailAddress: { address: options.replyTo },
    }];
  }

  // Note: saveToSentItems is a request-level property, not inside the message object
  await graphRequest(accessToken, '/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message,
      saveToSentItems: options.saveToSent !== false, // Default to true
    }),
  });
}

/**
 * Send multiple emails (one at a time, with small delay to avoid throttling)
 */
export async function sendBulkEmails(
  accessToken: string,
  emails: Array<{
    to: string[];
    subject: string;
    html: string;
    replyTo?: string;
  }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const email of emails) {
    try {
      await sendEmail(accessToken, email);
      results.success++;
      // Small delay between emails to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to send to ${email.to.join(', ')}: ${error}`);
    }
  }

  return results;
}

// =====================================================
// EMAIL READ FUNCTIONS (using Mail.Read permission)
// =====================================================

export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  sentDateTime: string;
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  from?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  isRead?: boolean;
  isDraft?: boolean;
  webLink?: string;
  conversationId?: string;
}

/**
 * Get sent emails from the Sent Items folder
 */
export async function getSentEmails(
  accessToken: string,
  options: {
    top?: number;
    skip?: number;
    since?: Date;
    search?: string;
  } = {}
): Promise<{ emails: OutlookEmail[]; nextLink?: string }> {
  const params = new URLSearchParams();

  params.set('$top', String(options.top || 50));
  params.set('$orderby', 'sentDateTime desc');
  params.set('$select', 'id,subject,bodyPreview,sentDateTime,toRecipients,from,isRead,webLink,conversationId');

  if (options.skip) {
    params.set('$skip', String(options.skip));
  }

  if (options.since) {
    params.set('$filter', `sentDateTime ge ${options.since.toISOString()}`);
  }

  if (options.search) {
    params.set('$search', `"${options.search}"`);
  }

  const result = await graphRequest<{ value: OutlookEmail[]; '@odata.nextLink'?: string }>(
    accessToken,
    `/me/mailFolders/SentItems/messages?${params.toString()}`
  );

  return {
    emails: result.value,
    nextLink: result['@odata.nextLink'],
  };
}

/**
 * Get a specific email by ID
 */
export async function getEmailById(
  accessToken: string,
  messageId: string
): Promise<OutlookEmail> {
  return graphRequest<OutlookEmail>(
    accessToken,
    `/me/messages/${messageId}?$select=id,subject,bodyPreview,sentDateTime,toRecipients,from,isRead,webLink,conversationId`
  );
}

/**
 * Get inbox emails (for tracking replies)
 */
export async function getInboxEmails(
  accessToken: string,
  options: {
    top?: number;
    unreadOnly?: boolean;
    since?: Date;
  } = {}
): Promise<{ emails: OutlookEmail[]; unreadCount: number }> {
  const params = new URLSearchParams();

  params.set('$top', String(options.top || 50));
  params.set('$orderby', 'receivedDateTime desc');
  params.set('$select', 'id,subject,bodyPreview,receivedDateTime,from,isRead,webLink,conversationId');

  const filters: string[] = [];
  if (options.unreadOnly) {
    filters.push('isRead eq false');
  }
  if (options.since) {
    filters.push(`receivedDateTime ge ${options.since.toISOString()}`);
  }
  if (filters.length > 0) {
    params.set('$filter', filters.join(' and '));
  }

  const result = await graphRequest<{ value: OutlookEmail[]; '@odata.count'?: number }>(
    accessToken,
    `/me/mailFolders/Inbox/messages?${params.toString()}&$count=true`
  );

  // Get unread count
  const countResult = await graphRequest<{ '@odata.count': number }>(
    accessToken,
    `/me/mailFolders/Inbox/messages/$count?$filter=isRead eq false`
  ).catch(() => ({ '@odata.count': 0 }));

  return {
    emails: result.value,
    unreadCount: typeof countResult === 'number' ? countResult : (countResult as { '@odata.count': number })['@odata.count'] || 0,
  };
}

/**
 * Mark an email as read
 */
export async function markEmailAsRead(
  accessToken: string,
  messageId: string
): Promise<void> {
  await graphRequest(accessToken, `/me/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
}
