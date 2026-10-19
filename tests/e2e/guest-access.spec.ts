import { expect, test } from '@playwright/test';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthSession, readAuthSession, verifyAuthSession } from '../../src/lib/auth-session';
import { getVerifiedGuestEmail, isKnownGuest, createGuestSignInToken, consumeGuestSignInToken } from '../../src/lib/guest-access';
import { privateEventsFor } from '../../src/lib/private-events';
import { buildIcs, weddingSchedule } from '../../src/lib/calendar';
import { verifyTurnstile } from '../../src/lib/turnstile';
import { proxy } from '../../src/proxy';

const secret = 'synthetic-guest-session-secret-at-least-32-characters';
const originalSessionSecret = process.env.AUTH_SESSION_SECRET;
const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const originalFetch = globalThis.fetch;

test.use({ serviceWorkers: 'block' });
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSessionSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = originalSessionSecret;
  if (originalTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
});

test('email identity requires an unexpired signed guest session, not the old password cookie or another role', async () => {
  process.env.AUTH_SESSION_SECRET = secret;
  const value = await createAuthSession('guest', secret, 60, 'NATE@example.com');
  const request = (cookie: string) => new NextRequest('https://www.nateandblake.me/api/guest/session', { headers: { cookie: `wedding-guest-auth=${cookie}` } });
  expect(await getVerifiedGuestEmail(request(value))).toBe('nate@example.com');
  expect(await getVerifiedGuestEmail(request(await createAuthSession('guest', secret, 60)))).toBeNull();
  expect(await getVerifiedGuestEmail(request(await createAuthSession('admin', secret, 60, 'nate@example.com')))).toBeNull();
  expect(await getVerifiedGuestEmail(request(await createAuthSession('guest', secret, -1, 'nate@example.com')))).toBeNull();
  expect(await readAuthSession(value + 'tampered', 'guest', secret)).toBeNull();
  expect(await verifyAuthSession(await createAuthSession('admin', secret, 60), 'admin', secret)).toBe(true);
});

test('sign-in token storage is hashed, short-lived, purpose-bound and atomically single-use', async () => {
  let stored: Record<string, unknown> | null = null;
  let consumed = false;
  const client = createClient('https://example.supabase.co', 'synthetic-service-role', { global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === 'POST') {
      stored = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    }
    expect(init?.method).toBe('PATCH');
    expect(url.searchParams.get('created_by')).toBe('eq.guest_sign_in');
    expect(url.searchParams.get('revoked_at')).toBe('is.null');
    expect(url.searchParams.get('expires_at')).toMatch(/^gt\./);
    expect(url.searchParams.get('token_hash')).toBe(`eq.${stored!.token_hash}`);
    const data = consumed ? null : { email: 'nate@example.com' };
    consumed = true;
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } } });
  const token = await createGuestSignInToken(client, 'nate@example.com');
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(stored!.token_hash).not.toBe(token);
  expect(stored!.created_by).toBe('guest_sign_in');
  expect(Date.parse(String(stored!.expires_at)) - Date.now()).toBeGreaterThan(14 * 60_000);
  expect(Date.parse(String(stored!.expires_at)) - Date.now()).toBeLessThanOrEqual(15 * 60_000);
  expect(await consumeGuestSignInToken(client, token)).toBe('nate@example.com');
  expect(await consumeGuestSignInToken(client, token)).toBeNull();
});

test('known-guest matching does not create invitations and private calendars never enter the public schedule', async () => {
  const client = createClient('https://example.supabase.co', 'synthetic-service-role', { global: { fetch: async input => {
    const url = new URL(String(input));
    expect(url.searchParams.get('email')).toMatch(/^eq\./);
    return new Response(JSON.stringify(url.pathname.endsWith('/guest_events') && url.searchParams.get('email') === 'eq.invited@example.com' ? [{ email: 'invited@example.com' }] : []), { headers: { 'Content-Type': 'application/json' } });
  } } });
  expect(await isKnownGuest(client, 'invited@example.com')).toBe(true);
  expect(await isKnownGuest(client, 'unknown@example.com')).toBe(false);
  expect(privateEventsFor([])).toEqual([]);
  expect(privateEventsFor(['rehearsal_dinner']).map(event => event.slug)).toEqual(['rehearsal_dinner']);
  expect(buildIcs(weddingSchedule)).not.toContain('Rehearsal');
  expect(buildIcs(privateEventsFor(['rehearsal_dinner']).flatMap(event => event.calendarEvent ? [event.calendarEvent] : []))).toContain('Rehearsal Dinner');
});

test('server Turnstile checks reject missing, forged, wrong-host, wrong-action and replayed tokens', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'synthetic-turnstile-secret';
  let calls = 0;
  const result: { success: boolean; hostname: string; action: string } = { success: true, hostname: 'www.nateandblake.me', action: 'photos' };
  globalThis.fetch = async (_url, init) => {
    calls++;
    expect(JSON.parse(String(init?.body)).response).toBe('valid-test-token');
    expect(init?.signal).toBeTruthy();
    return new Response(JSON.stringify(result));
  };
  expect(await verifyTurnstile(null, 'unknown', 'www.nateandblake.me', 'photos')).toBe(false);
  expect(await verifyTurnstile('x'.repeat(2049), 'unknown', 'www.nateandblake.me', 'photos')).toBe(false);
  expect(calls).toBe(0);
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'www.nateandblake.me', 'photos')).toBe(true);
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'evil.example', 'photos')).toBe(false);
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'www.nateandblake.me', 'guestbook')).toBe(false);
  result.success = false;
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'www.nateandblake.me', 'photos')).toBe(false);
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'www.nateandblake.me', 'photos')).toBe(false);
  delete process.env.TURNSTILE_SECRET_KEY;
  expect(await verifyTurnstile('valid-test-token', 'unknown', 'www.nateandblake.me', 'photos')).toBe(false);
});

test('public browsing cannot bypass admin auth, and every named public form mutation requires Turnstile', async ({ request }) => {
  for (const path of ['/api/photos', '/api/guestbook', '/api/guestbook/media', '/api/songs', '/api/songs/vote', '/api/rsvp', '/api/rsvp/edit-link', '/api/guest/request-link']) {
    expect((await request.post(path, { data: {} })).status(), path).toBe(403);
  }
  expect((await request.post('/api/auth', { data: { type: 'guest', password: 'old-password' } })).status()).toBe(410);
  for (const path of ['/api/admin/stats', '/api/admin/addresses', '/api/admin/event-invitations']) expect((await request.get(path)).status()).toBe(401);
  const admin = await proxy(new NextRequest('https://www.nateandblake.me/admin'));
  expect(admin.status).toBe(307);
  expect(admin.headers.get('location')).toContain('/login?redirect=%2Fadmin');
  const anonymous = await request.get('/api/guest/session?email=invited@example.com');
  expect(await anonymous.json()).toEqual({ email: null, events: [] });
  expect(anonymous.headers()['cache-control']).toContain('no-store');
});

test('public events and sign-in pages fit mobile and do not expose private event cards or details', async ({ page, request }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/events');
    await expect(page.getByRole('link', { name: 'Find my invitations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rehearsal Dinner' })).toHaveCount(0);
    expect(await page.content()).not.toContain('2027-10-30T17:00:00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto('/guest/sign-in');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  // Merely opening a sign-in link must not consume it or set an identity cookie.
  let consumed = false;
  await page.route('**/api/guest/verify-link', route => { consumed = true; return route.fulfill({ json: { success: true } }); });
  await page.goto('/guest/sign-in?token=' + 'x'.repeat(43));
  await expect(page.getByRole('button', { name: 'Open my invitations' })).toBeVisible();
  expect(consumed).toBe(false);
  expect((await request.get('/api/guest/session')).headers()['cache-control']).toContain('no-store');
});

const mockTurnstile = `(() => {
  let count=0; const widgets={};
  window.turnstile={ render: (_el,options)=>{const id='widget-'+Object.keys(widgets).length; widgets[id]=options; return id;},
    reset:()=>{}, remove:id=>{delete widgets[id]}, execute:id=>{setTimeout(()=>widgets[id].callback('single-use-test-'+(++count)),10)} };
})();`;

test('email sign-in sends a fresh Turnstile token and shows the generic no-enumeration response', async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, 'Requires a synthetic public site key at local build time.');
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({ contentType: 'application/javascript', body: mockTurnstile }));
  let sent = false;
  await page.route('**/api/guest/request-link', async route => {
    expect(route.request().headers()['x-turnstile-token']).toMatch(/^single-use-test-/);
    expect(route.request().postDataJSON()).toEqual({ email: 'nate@example.com' });
    sent = true;
    await route.fulfill({ json: { success: true, message: 'If this email is on our guest list, a private sign-in link is on its way.' } });
  });
  await page.goto('/guest/sign-in');
  await page.getByLabel('Email address').fill('nate@example.com');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('status')).toContainText('If this email');
  expect(sent).toBe(true);
});

test('guestbook submissions and each file in a photo batch get separate tokens without making real writes', async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, 'Requires a synthetic public site key at local build time.');
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({ contentType: 'application/javascript', body: mockTurnstile }));
  const tokens: string[] = [];
  await page.route('**/api/guestbook', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { entries: [] } });
    tokens.push(route.request().headers()['x-turnstile-token']);
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/guestbook');
  await page.getByLabel('Your Name', { exact: true }).fill('Test Guest');
  await page.getByLabel('Your Email').fill('guest@example.com');
  await page.getByPlaceholder(/memories|wishes/i).fill('Wishing you both a wonderful wedding!');
  await page.getByRole('button', { name: 'Sign Guest Book', exact: true }).click();
  await expect.poll(() => tokens.length).toBe(1);
  expect(tokens[0]).toMatch(/^single-use-test-/);

  tokens.length = 0;
  await page.route('**/api/photos', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { photos: [] } });
    tokens.push(route.request().headers()['x-turnstile-token']);
    return route.fulfill({ status: 400, json: { error: 'Test upload stopped before storage.' } });
  });
  await page.goto('/photos');
  await page.getByLabel('Your Name', { exact: true }).fill('Test Guest');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type="file"][multiple]').setInputFiles(['one','two'].map(name => ({ name: name+'.png', mimeType: 'image/png', buffer: png })));
  await page.getByRole('button', { name: /Share 2 Photos/i }).click();
  await expect.poll(() => tokens.length).toBe(2);
  expect(new Set(tokens).size).toBe(2);
  expect(tokens.every(token => /^single-use-test-/.test(token))).toBe(true);
});
