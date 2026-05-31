import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { supabase, isSupabaseConfigured, isSupabaseServiceRoleConfigured } from '@/lib/supabase-server';
import {
  refreshAccessToken,
  sendEmail as sendMicrosoftEmail,
} from '@/lib/microsoft-graph';

export type ReadinessStatus = 'ok' | 'degraded';

type EnvCheck = {
  name: string;
  present: boolean;
  category: 'auth' | 'supabase' | 'email' | 'push' | 'webhook' | 'runtime';
  requiredFor: string;
  secret: boolean;
};

type SupabaseTableCheck = {
  name: string;
  ok: boolean;
  count: number | null;
  required: boolean;
  error?: string;
  code?: string;
};

type SupabaseBucketCheck = {
  name: string;
  ok: boolean;
  public: boolean | null;
  required: boolean;
  error?: string;
  code?: string;
};

type EmailReadiness = {
  ok: boolean;
  preferredProvider: 'microsoft' | 'resend' | null;
  resend: {
    ok: boolean;
    apiKeyPresent: boolean;
    webhookSecretPresent: boolean;
  };
  microsoft: {
    ok: boolean;
    oauthEnvPresent: boolean;
    webhookSecretPresent: boolean;
    authTableReadable: boolean;
    connected: boolean;
    tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'not_connected' | 'unreadable';
    expiresInMinutes: number | null;
    error?: string;
  };
};

type PushReadiness = {
  ok: boolean;
  vapidPublicKeyPresent: boolean;
  vapidPrivateKeyPresent: boolean;
  vapidSubjectPresent: boolean;
  tableReadable: boolean;
  subscriptionCount: number | null;
  canSend: boolean;
  error?: string;
};

export type AdminOperationsReadiness = {
  status: ReadinessStatus;
  timestamp: string;
  deployment: {
    runtime: 'nodejs';
    nodeVersion: string;
    platform: NodeJS.Platform;
    arch: string;
    nodeEnv: string | null;
    vercel: boolean;
    vercelEnv: string | null;
    region: string | null;
    git: {
      commitSha: string | null;
      branch: string | null;
      repoSlug: string | null;
    };
  };
  env: {
    checks: EnvCheck[];
    requiredPresent: boolean;
    missingRequired: string[];
  };
  email: EmailReadiness;
  push: PushReadiness;
  supabase: {
    configured: boolean;
    serviceRoleConfigured: boolean;
    tables: SupabaseTableCheck[];
    buckets: SupabaseBucketCheck[];
    requiredTablesReady: boolean;
    requiredBucketsReady: boolean;
  };
  checks: Record<string, boolean>;
};

type MicrosoftAuthRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  guest_email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const REQUIRED_ENV_CHECKS: Array<Omit<EnvCheck, 'present'>> = [
  { name: 'SITE_PASSWORD', category: 'auth', requiredFor: 'guest access', secret: true },
  { name: 'GUEST_PASSWORD', category: 'auth', requiredFor: 'legacy guest access fallback', secret: true },
  { name: 'ADMIN_PASSWORD', category: 'auth', requiredFor: 'admin access', secret: true },
  { name: 'AUTH_SESSION_SECRET', category: 'auth', requiredFor: 'signed auth cookies', secret: true },
  { name: 'WEDDING_AUTH_SESSION_SECRET', category: 'auth', requiredFor: 'legacy signed auth cookie fallback', secret: true },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', category: 'supabase', requiredFor: 'Supabase client', secret: false },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', category: 'supabase', requiredFor: 'public Supabase client', secret: false },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', category: 'supabase', requiredFor: 'server/admin Supabase access', secret: true },
  { name: 'RESEND_API_KEY', category: 'email', requiredFor: 'Resend fallback email', secret: true },
  { name: 'RESEND_WEBHOOK_SECRET', category: 'webhook', requiredFor: 'Resend webhook verification', secret: true },
  { name: 'MICROSOFT_CLIENT_ID', category: 'email', requiredFor: 'Microsoft Graph OAuth', secret: false },
  { name: 'MICROSOFT_CLIENT_SECRET', category: 'email', requiredFor: 'Microsoft Graph OAuth refresh', secret: true },
  { name: 'MICROSOFT_WEBHOOK_SECRET', category: 'webhook', requiredFor: 'Microsoft webhook verification', secret: true },
  { name: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', category: 'push', requiredFor: 'browser push subscription', secret: false },
  { name: 'VAPID_PRIVATE_KEY', category: 'push', requiredFor: 'server push send', secret: true },
  { name: 'VAPID_SUBJECT', category: 'push', requiredFor: 'optional VAPID contact subject override', secret: false },
  { name: 'NEXT_PUBLIC_SITE_URL', category: 'runtime', requiredFor: 'absolute callback/webhook URLs', secret: false },
  { name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', category: 'runtime', requiredFor: 'public address form bot check', secret: false },
  { name: 'TURNSTILE_SECRET_KEY', category: 'runtime', requiredFor: 'server address form bot check', secret: true },
  { name: 'USPS_CONSUMER_KEY', category: 'runtime', requiredFor: 'USPS address validation', secret: true },
  { name: 'USPS_CONSUMER_SECRET', category: 'runtime', requiredFor: 'USPS address validation', secret: true },
];

const TABLE_CHECKS: Array<{ name: string; required: boolean }> = [
  { name: 'rsvps', required: true },
  { name: 'guest_addresses', required: true },
  { name: 'guestbook', required: true },
  { name: 'photos', required: true },
  { name: 'emails', required: true },
  { name: 'email_campaigns', required: true },
  { name: 'email_sends', required: true },
  { name: 'guest_events', required: true },
  { name: 'live_updates', required: true },
  { name: 'push_subscriptions', required: true },
  { name: 'song_requests', required: true },
  { name: 'song_votes', required: true },
  { name: 'budget_settings', required: true },
  { name: 'budget_categories', required: true },
  { name: 'expenses', required: true },
  { name: 'gifts', required: true },
  { name: 'tasks', required: true },
  { name: 'timeline_events', required: true },
  { name: 'vendors', required: true },
  { name: 'vendor_portal_tokens', required: true },
  { name: 'vendor_checklist_items', required: true },
  { name: 'microsoft_auth', required: false },
  { name: 'admin_audit_events', required: true },
  { name: 'wedding_rate_limits', required: true },
  { name: 'rsvp_edit_tokens', required: true },
];

const BUCKET_CHECKS: Array<{ name: string; required: boolean }> = [
  { name: 'wedding', required: true },
  { name: 'guestbook-media', required: true },
];

function present(name: string): boolean {
  return Boolean(process.env[name]);
}

function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT || 'mailto:nate@nateandblake.wedding';
}

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
}

function safeErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function getEnvReadiness() {
  const checks = REQUIRED_ENV_CHECKS.map((check) => ({
    ...check,
    present: present(check.name),
  }));

  const groupedRequirements = {
    sitePassword: present('SITE_PASSWORD') || present('GUEST_PASSWORD'),
    authSessionSecret: present('AUTH_SESSION_SECRET') || present('WEDDING_AUTH_SESSION_SECRET'),
    supabase: present('NEXT_PUBLIC_SUPABASE_URL') && present('NEXT_PUBLIC_SUPABASE_ANON_KEY') && present('SUPABASE_SERVICE_ROLE_KEY'),
    emailProvider: present('RESEND_API_KEY') || (present('MICROSOFT_CLIENT_ID') && present('MICROSOFT_CLIENT_SECRET')),
    push: present('NEXT_PUBLIC_VAPID_PUBLIC_KEY') && present('VAPID_PRIVATE_KEY'),
  };

  const missingRequired = [
    ...(!groupedRequirements.sitePassword ? ['SITE_PASSWORD or GUEST_PASSWORD'] : []),
    ...(!present('ADMIN_PASSWORD') ? ['ADMIN_PASSWORD'] : []),
    ...(!groupedRequirements.authSessionSecret ? ['AUTH_SESSION_SECRET or WEDDING_AUTH_SESSION_SECRET'] : []),
    ...(!present('NEXT_PUBLIC_SUPABASE_URL') ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
    ...(!present('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
    ...(!present('SUPABASE_SERVICE_ROLE_KEY') ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ...(!groupedRequirements.emailProvider ? ['RESEND_API_KEY or Microsoft OAuth env'] : []),
    ...(!groupedRequirements.push ? ['NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY'] : []),
  ];

  return {
    checks,
    requiredPresent: Boolean(
      groupedRequirements.sitePassword &&
      present('ADMIN_PASSWORD') &&
      groupedRequirements.authSessionSecret &&
      groupedRequirements.supabase &&
      groupedRequirements.emailProvider &&
      groupedRequirements.push
    ),
    missingRequired: Array.from(new Set(missingRequired)),
  };
}

function getDeploymentMetadata(): AdminOperationsReadiness['deployment'] {
  return {
    runtime: 'nodejs',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV || null,
    vercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV || null,
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || null,
    git: {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) : null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      repoSlug: process.env.VERCEL_GIT_REPO_SLUG || null,
    },
  };
}

async function checkTable(name: string, required: boolean): Promise<SupabaseTableCheck> {
  if (!supabase || !isSupabaseServiceRoleConfigured()) {
    return {
      name,
      ok: false,
      count: null,
      required,
      error: 'Supabase service role is not configured',
    };
  }

  const { count, error } = await supabase
    .from(name)
    .select('*', { head: true, count: 'exact' })
    .limit(1);

  return {
    name,
    ok: !error,
    count: error ? null : count ?? 0,
    required,
    ...(error ? { error: error.message, code: error.code } : {}),
  };
}

async function checkBucket(name: string, required: boolean): Promise<SupabaseBucketCheck> {
  if (!supabase || !isSupabaseServiceRoleConfigured()) {
    return {
      name,
      ok: false,
      public: null,
      required,
      error: 'Supabase service role is not configured',
    };
  }

  const { data, error } = await supabase.storage.getBucket(name);

  return {
    name,
    ok: !error && Boolean(data),
    public: data?.public ?? null,
    required,
    ...(error ? { error: error.message, code: error.name } : {}),
  };
}

async function getSupabaseReadiness(): Promise<AdminOperationsReadiness['supabase']> {
  const [tables, buckets] = await Promise.all([
    Promise.all(TABLE_CHECKS.map(({ name, required }) => checkTable(name, required))),
    Promise.all(BUCKET_CHECKS.map(({ name, required }) => checkBucket(name, required))),
  ]);

  return {
    configured: isSupabaseConfigured(),
    serviceRoleConfigured: isSupabaseServiceRoleConfigured(),
    tables,
    buckets,
    requiredTablesReady: tables.filter((table) => table.required).every((table) => table.ok),
    requiredBucketsReady: buckets.filter((bucket) => bucket.required).every((bucket) => bucket.ok),
  };
}

async function getMicrosoftAuthRow(): Promise<{ row: MicrosoftAuthRow | null; error?: string }> {
  if (!supabase || !isSupabaseConfigured()) {
    return { row: null, error: 'Supabase is not configured' };
  }

  const { data, error } = await supabase
    .from('microsoft_auth')
    .select('access_token, refresh_token, expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  return { row: data as MicrosoftAuthRow | null };
}

async function getEmailReadiness(): Promise<EmailReadiness> {
  const resend = {
    ok: present('RESEND_API_KEY'),
    apiKeyPresent: present('RESEND_API_KEY'),
    webhookSecretPresent: present('RESEND_WEBHOOK_SECRET'),
  };

  const microsoft = {
    ok: false,
    oauthEnvPresent: present('MICROSOFT_CLIENT_ID') && present('MICROSOFT_CLIENT_SECRET'),
    webhookSecretPresent: present('MICROSOFT_WEBHOOK_SECRET'),
    authTableReadable: false,
    connected: false,
    tokenStatus: 'not_connected' as EmailReadiness['microsoft']['tokenStatus'],
    expiresInMinutes: null as number | null,
    error: undefined as string | undefined,
  };

  const { row, error } = await getMicrosoftAuthRow();
  microsoft.authTableReadable = !error;
  if (error) {
    microsoft.tokenStatus = 'unreadable';
    microsoft.error = error;
  } else if (row) {
    microsoft.connected = true;
    const expiresInMinutes = Math.round((new Date(row.expires_at).getTime() - Date.now()) / 60000);
    microsoft.expiresInMinutes = expiresInMinutes;
    if (expiresInMinutes <= 0) microsoft.tokenStatus = 'expired';
    else if (expiresInMinutes <= 15) microsoft.tokenStatus = 'expiring_soon';
    else microsoft.tokenStatus = 'valid';
    microsoft.ok = microsoft.oauthEnvPresent && microsoft.tokenStatus !== 'expired';
  }

  const preferredProvider = microsoft.ok ? 'microsoft' : resend.ok ? 'resend' : null;

  return {
    ok: Boolean(preferredProvider),
    preferredProvider,
    resend,
    microsoft,
  };
}

async function getPushReadiness(): Promise<PushReadiness> {
  const base: PushReadiness = {
    ok: false,
    vapidPublicKeyPresent: present('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
    vapidPrivateKeyPresent: present('VAPID_PRIVATE_KEY'),
    vapidSubjectPresent: Boolean(getVapidSubject()),
    tableReadable: false,
    subscriptionCount: null,
    canSend: false,
  };

  if (!supabase || !isSupabaseConfigured()) {
    return { ...base, error: 'Supabase is not configured' };
  }

  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    return { ...base, error: error.message };
  }

  const canSend = base.vapidPublicKeyPresent && base.vapidPrivateKeyPresent && base.vapidSubjectPresent;

  return {
    ...base,
    tableReadable: true,
    subscriptionCount: count ?? 0,
    canSend,
    ok: canSend,
  };
}

function buildChecks(readiness: Omit<AdminOperationsReadiness, 'status' | 'timestamp' | 'checks'>): Record<string, boolean> {
  const requiredTableChecks = readiness.supabase.tables
    .filter((table) => table.required)
    .reduce<Record<string, boolean>>((acc, table) => {
      acc[`table_${table.name}`] = table.ok;
      return acc;
    }, {});

  const requiredBucketChecks = readiness.supabase.buckets
    .filter((bucket) => bucket.required)
    .reduce<Record<string, boolean>>((acc, bucket) => {
      acc[`bucket_${bucket.name.replace(/-/g, '_')}`] = bucket.ok;
      return acc;
    }, {});

  return {
    sitePassword: present('SITE_PASSWORD') || present('GUEST_PASSWORD'),
    adminPassword: present('ADMIN_PASSWORD'),
    authSessionSecret: present('AUTH_SESSION_SECRET') || present('WEDDING_AUTH_SESSION_SECRET'),
    supabaseUrl: present('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: present('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRole: isSupabaseServiceRoleConfigured(),
    emailProvider: readiness.email.ok,
    vapid: readiness.push.canSend,
    pushSubscriptionsReadable: readiness.push.tableReadable,
    supabaseRequiredTables: readiness.supabase.requiredTablesReady,
    supabaseRequiredBuckets: readiness.supabase.requiredBucketsReady,
    ...requiredTableChecks,
    ...requiredBucketChecks,
  };
}

export async function getAdminOperationsReadiness(): Promise<AdminOperationsReadiness> {
  const [supabaseReadiness, email, push] = await Promise.all([
    getSupabaseReadiness(),
    getEmailReadiness(),
    getPushReadiness(),
  ]);

  const readinessWithoutStatus = {
    deployment: getDeploymentMetadata(),
    env: getEnvReadiness(),
    email,
    push,
    supabase: supabaseReadiness,
  };
  const checks = buildChecks(readinessWithoutStatus);
  const status: ReadinessStatus = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    ...readinessWithoutStatus,
    checks,
  };
}

async function getMicrosoftAccessTokenForSend(): Promise<string | null> {
  const { row } = await getMicrosoftAuthRow();
  if (!row) return null;

  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() - Date.now() >= 5 * 60 * 1000) {
    return row.access_token;
  }

  if (!present('MICROSOFT_CLIENT_ID') || !present('MICROSOFT_CLIENT_SECRET')) {
    return null;
  }

  try {
    const newTokens = await refreshAccessToken(row.refresh_token);
    await supabase
      ?.from('microsoft_auth')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('access_token', row.access_token);

    return newTokens.access_token;
  } catch (error) {
    console.error('Admin test email Microsoft token refresh failed:', safeError(error));
    return null;
  }
}

function testEmailHtml(): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 32px;">
      <h1 style="color: #d4af37; margin-top: 0;">Nate & Blake Ops Test</h1>
      <p style="color: #a5b697; line-height: 1.6;">This is a safe admin-triggered test email confirming the wedding site's email provider can send.</p>
      <p style="color: #536537; font-size: 13px;">Sent at ${new Date().toISOString()}.</p>
    </div>
  `;
}

export async function sendAdminTestEmail(to: string): Promise<{ ok: boolean; provider: 'microsoft' | 'resend' | null; id?: string; error?: string }> {
  const subject = '[TEST] Nate & Blake Wedding Ops Email';
  const html = testEmailHtml();

  const microsoftToken = await getMicrosoftAccessTokenForSend();
  if (microsoftToken) {
    try {
      await sendMicrosoftEmail(microsoftToken, { to: [to], subject, html });
      return { ok: true, provider: 'microsoft', id: `ms-${Date.now()}` };
    } catch (error) {
      console.error('Admin test email via Microsoft failed:', safeError(error));
    }
  }

  if (!present('RESEND_API_KEY')) {
    return { ok: false, provider: null, error: 'No email provider is configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nate & Blake Say I Do <wedding@nateandblake.me>',
        to: [to],
        subject,
        html,
        reply_to: 'nateandblakesayido@outlook.com',
      }),
    });

    const data = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string };
    if (!response.ok) {
      return { ok: false, provider: 'resend', error: data.message || data.error || `Resend responded with ${response.status}` };
    }

    return { ok: true, provider: 'resend', id: data.id };
  } catch (error) {
    return { ok: false, provider: 'resend', error: safeError(error) };
  }
}

function configureWebPush(): { ok: boolean; error?: string } {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return { ok: false, error: 'VAPID public/private keys are not configured' };
  }

  webpush.setVapidDetails(getVapidSubject(), vapidPublicKey, vapidPrivateKey);
  return { ok: true };
}

async function getPushSubscription(target: { subscriptionId?: string; endpoint?: string; latest?: boolean }): Promise<{ row: PushSubscriptionRow | null; error?: string; code?: string }> {
  if (!supabase || !isSupabaseConfigured()) {
    return { row: null, error: 'Supabase is not configured' };
  }

  let query = supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth, guest_email, created_at, updated_at')
    .limit(1);

  if (target.subscriptionId) {
    query = query.eq('id', target.subscriptionId);
  } else if (target.endpoint) {
    query = query.eq('endpoint', target.endpoint);
  } else if (target.latest) {
    query = query.order('updated_at', { ascending: false });
  } else {
    return { row: null, error: 'Choose subscriptionId, endpoint, or latest=true' };
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { row: null, error: error.message, code: safeErrorCode(error) };
  return { row: data as PushSubscriptionRow | null };
}

export async function sendAdminTestPush(target: {
  subscriptionId?: string;
  endpoint?: string;
  latest?: boolean;
  title?: string;
  body?: string;
}): Promise<{
  ok: boolean;
  subscriptionId?: string;
  endpointHash?: string;
  guestEmailPresent?: boolean;
  error?: string;
  statusCode?: number;
}> {
  const vapid = configureWebPush();
  if (!vapid.ok) return { ok: false, error: vapid.error };

  const { row, error } = await getPushSubscription(target);
  if (error) return { ok: false, error };
  if (!row) return { ok: false, error: 'No matching push subscription found' };

  const payload = JSON.stringify({
    title: target.title || 'Wedding Ops Test',
    body: target.body || 'Push notifications are ready for Nate & Blake\'s wedding site.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `admin-test-${Date.now()}`,
    data: {
      url: '/live',
      test: true,
    },
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.keys_p256dh,
          auth: row.keys_auth,
        },
      },
      payload
    );

    return {
      ok: true,
      subscriptionId: row.id,
      endpointHash: hashIdentifier(row.endpoint),
      guestEmailPresent: Boolean(row.guest_email),
    };
  } catch (error) {
    const pushError = error as { statusCode?: number };
    return {
      ok: false,
      subscriptionId: row.id,
      endpointHash: hashIdentifier(row.endpoint),
      guestEmailPresent: Boolean(row.guest_email),
      error: safeError(error),
      statusCode: pushError.statusCode,
    };
  }
}
