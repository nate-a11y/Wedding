import { expect, test } from '@playwright/test';
import { NextRequest } from 'next/server';
import { isEmailConfigured, sendEmail, sendBatchEmails } from '../../src/lib/email-provider';
import { mergeEmailSendHistory, type EmailSendHistoryEntry } from '../../src/lib/email-send-history';

test.describe('Resend wedding delivery', () => {
  test.describe.configure({ mode: 'serial' });
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const options = { to: ['guest@example.test'], subject: 'Wedding test', html: '<p>Test</p>' };
  const requests: { url: string; body: Record<string, unknown> | Record<string, unknown>[] }[] = [];

  test.beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-only-key';
    requests.length = 0;
    globalThis.fetch = async (input, init) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return Response.json(String(input).endsWith('/batch') ? { data: [{ id: 'batch-id' }] } : { id: 'resend-id' });
    };
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  test('sends from the verified domain with Outlook Reply-To, without contacting Microsoft', async () => {
    expect(await sendEmail(options)).toEqual({ id: 'resend-id', provider: 'resend' });
    expect(requests).toEqual([{
      url: 'https://api.resend.com/emails',
      body: { ...options, from: 'Nate & Blake Say I Do <wedding@nateandblake.me>', reply_to: 'nateandblakesayido@outlook.com' },
    }]);
  });

  test('preserves an explicit Reply-To', async () => {
    await sendEmail({ ...options, replyTo: 'reply@example.test' });
    expect(requests[0].body).toMatchObject({ reply_to: 'reply@example.test' });
  });

  test('missing Resend configuration fails without a Microsoft fallback', async () => {
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
    expect(await sendEmail(options)).toMatchObject({ error: 'Resend API key not configured' });
    expect(await sendBatchEmails([])).toMatchObject({ error: 'API key not configured' });
    expect(requests).toHaveLength(0);
  });

  test('Resend rejection and network errors remain failures, never fallback sends', async () => {
    globalThis.fetch = async () => Response.json({ message: 'Rejected' }, { status: 422 });
    expect(await sendEmail(options)).toEqual({ error: 'Rejected' });
    expect(await sendBatchEmails([])).toEqual({ error: 'Rejected' });
    globalThis.fetch = async () => { throw new Error('Offline'); };
    expect(await sendEmail(options)).toEqual({ error: 'Offline' });
    expect(await sendBatchEmails([])).toEqual({ error: 'Offline' });
  });

  test('batch delivery sets Outlook Reply-To for every recipient', async () => {
    const email = { ...options, from: 'Nate & Blake Say I Do <wedding@nateandblake.me>' };
    expect(await sendBatchEmails([email, { ...email, reply_to: 'custom@example.test' }])).toEqual({ data: [{ id: 'batch-id' }] });
    expect(requests).toEqual([{
      url: 'https://api.resend.com/emails/batch',
      body: [{ ...email, reply_to: 'nateandblakesayido@outlook.com' }, { ...email, reply_to: 'custom@example.test' }],
    }]);
  });
});

test('Send History includes confirmations, preserves legacy sends, and merges campaign delivery status', () => {
  const campaign: EmailSendHistoryEntry = { id: 'send-1', campaign_id: 'campaign-1', email: 'guest@example.test', guest_name: 'Guest Name', status: 'sent', sent_at: '2026-10-18T01:00:00Z', error_message: null, created_at: '2026-10-18T01:00:00Z' };
  const legacy = { ...campaign, id: 'legacy', campaign_id: 'old-campaign', created_at: '2026-10-17T01:00:00Z' };
  const confirmation = { id: 'confirmation', related_id: null, to_address: 'another@example.test', status: 'sent', sent_at: null, created_at: '2026-10-18T02:00:00Z' };
  const delivered = { ...confirmation, id: 'delivery', related_id: 'campaign-1', to_address: 'GUEST@example.test', status: 'delivered', created_at: campaign.created_at };
  const failed = { ...confirmation, id: 'failed', status: 'failed', created_at: '2026-10-18T03:00:00Z' };
  const history = mergeEmailSendHistory([campaign, legacy], [confirmation, delivered, failed]);
  expect(history.map(send => send.id)).toEqual(['failed', 'confirmation', 'delivery', 'legacy']);
  expect(history[0].sent_at).toBeNull();
  expect(history[1].sent_at).toBe(confirmation.created_at);
  expect(history[2]).toMatchObject({ guest_name: 'Guest Name', campaign_id: 'campaign-1', status: 'delivered' });
  expect(mergeEmailSendHistory([], Array.from({ length: 105 }, (_, i) => ({ ...confirmation, id: String(i) })))).toHaveLength(100);
});


test('logged website sends record Resend IDs and preserve failure status', async () => {
  const oldFetch = globalThis.fetch;
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'] as const;
  const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const logs: Record<string, unknown>[] = [];
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-key';
    process.env.RESEND_API_KEY = 'test-only-resend-key';
    let rejected = false;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === 'https://api.resend.com/emails') {
        return rejected ? Response.json({ message: 'Rejected' }, { status: 422 }) : Response.json({ id: 'logged-resend-id' });
      }
      expect(url).toBe('https://database.example.test/rest/v1/emails');
      logs.push(JSON.parse(String(init?.body)));
      return new Response(null, { status: 201 });
    };
    const { sendLoggedEmail, sendAddressConfirmation } = await import('../../src/lib/email');
    expect(await sendLoggedEmail({ to: ['guest@example.test'], subject: 'Campaign', html: '<p>Test</p>', emailType: 'campaign', relatedId: 'campaign-id' })).toMatchObject({ id: 'logged-resend-id', provider: 'resend' });
    expect(logs[0]).toMatchObject({ resend_id: 'logged-resend-id', direction: 'outbound', to_address: 'guest@example.test', status: 'sent', email_type: 'campaign', related_id: 'campaign-id' });
    expect(await sendAddressConfirmation({ to: 'guest@example.test', name: 'Test Guest', isUpdate: false, address: { street: 'Test only', city: 'Test City', state: 'MO', postalCode: '00000', country: 'United States' } })).toBe(true);
    expect(logs[1]).toMatchObject({ resend_id: 'logged-resend-id', status: 'sent', email_type: 'address_confirmation' });
    rejected = true;
    expect(await sendLoggedEmail({ to: ['guest@example.test'], subject: 'Reminder', html: '<p>Test</p>', emailType: 'rsvp_reminder' })).toMatchObject({ error: 'Rejected' });
    expect(logs[2]).toMatchObject({ resend_id: null, status: 'failed', email_type: 'rsvp_reminder' });
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
  }
});

test('Resend webhooks reject unsigned events, update delivery status, and retry database failures', async () => {
  const { createHmac } = await import('node:crypto');
  const oldFetch = globalThis.fetch;
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_WEBHOOK_SECRET'] as const;
  const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-key';
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from('test-only-signature-key').toString('base64')}`;
    const { POST } = await import('../../src/app/api/webhooks/resend/route');
    const payload = JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'resend-test-id', from: 'wedding@nateandblake.me', to: ['guest@example.test'], subject: 'Test' } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', 'test-only-signature-key').update(`test-event.${timestamp}.${payload}`).digest('base64');
    const headers = { 'svix-id': 'test-event', 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` };
    const updates: Record<string, unknown>[] = [];
    let databaseFailed = false;
    globalThis.fetch = async (input, init) => {
      expect(String(input)).toContain('https://database.example.test/rest/v1/emails?');
      if (init?.method === 'PATCH') {
        updates.push(JSON.parse(String(init.body)));
        return databaseFailed ? Response.json({ message: 'Database unavailable' }, { status: 503 }) : new Response(null, { status: 204 });
      }
      return Response.json({ id: 'existing-log' });
    };
    expect((await POST(new NextRequest('https://wedding.example.test/api/webhooks/resend', { method: 'POST', body: payload }))).status).toBe(401);
    expect((await POST(new NextRequest('https://wedding.example.test/api/webhooks/resend', { method: 'POST', headers, body: payload }))).status).toBe(200);
    expect(updates).toEqual([{ status: 'delivered' }]);
    databaseFailed = true;
    expect((await POST(new NextRequest('https://wedding.example.test/api/webhooks/resend', { method: 'POST', headers, body: payload }))).status).toBe(500);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
  }
});
