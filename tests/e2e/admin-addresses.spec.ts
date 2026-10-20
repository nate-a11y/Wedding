import { expect, test } from '@playwright/test';
import { NextRequest, NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { adminAddressCreateSchema, adminAddressUpdateSchema } from '../../src/lib/validation';

const requireModule = createRequire(__filename);
// Keep mocked requests in Playwright rather than letting the PWA worker bypass interception.
test.use({ serviceWorkers: 'block' });
const id = '11111111-1111-4111-8111-111111111111';
const fields = { name: 'Test Guest', email: 'guest@example.test', phone: '', street_address: '123 Test Lane', street_address_2: '', city: 'Test City', state: 'MO', postal_code: '65065', country: 'United States' };
const record = { ...fields, id, phone: null, street_address_2: null, linked_rsvp_id: null, rsvps: null, created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z' };

test('admin address schemas normalize fields, support international addresses, and reject metadata writes', () => {
  expect(adminAddressCreateSchema.parse({ ...fields, name: '  Test Guest ', email: ' GUEST@EXAMPLE.TEST ' })).toMatchObject({ name: 'Test Guest', email: 'guest@example.test' });
  for (const invalid of [{ name: 'Test' }, { email: 'invalid' }, { street_address: '' }, { state: '' }, { country: '' }, { postal_code: 'x'.repeat(21) }, { linked_rsvp_id: id }, { created_at: record.created_at }]) {
    expect(adminAddressCreateSchema.safeParse({ ...fields, ...invalid }).success).toBe(false);
  }
  expect(adminAddressCreateSchema.safeParse({ ...fields, country: 'Ireland', state: '' }).success).toBe(true);
  expect(adminAddressUpdateSchema.safeParse({ ...fields, id }).success).toBe(false);
  expect(adminAddressUpdateSchema.safeParse({ ...fields, id, updated_at: null }).success).toBe(true);
});

test('all address CRUD methods reject unauthenticated requests', async ({ request }) => {
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    expect((await request.fetch('/api/admin/addresses', { method, ...(method === 'GET' ? {} : { data: fields }) })).status()).toBe(401);
  }
});

test('admin address handlers scope mutations, protect against duplicates/stale edits, and audit without sending emails', async () => {
  const cachedModules = new Set(Object.keys(requireModule.cache));
  const auth = requireModule('../../src/lib/admin-auth') as typeof import('../../src/lib/admin-auth');
  const database = requireModule('../../src/lib/supabase-server') as { supabase: ReturnType<typeof createClient> | null; isSupabaseConfigured: () => boolean };
  const originals = { auth: auth.requireAdminAuth, client: database.supabase, configured: database.isSupabaseConfigured };
  const requests: { url: URL; method: string; body: Record<string, unknown> }[] = [];
  let result: unknown = record;
  let status = 200;
  let allowed = true;
  try {
    auth.requireAdminAuth = async () => allowed ? null : NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    database.supabase = createClient('https://database.example.test', 'synthetic-test-key', { global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://database.example.test');
      requests.push({ url, method: init?.method || 'GET', body: JSON.parse(String(init?.body || '{}')) });
      if (url.pathname.endsWith('/admin_audit_events')) return new Response(null, { status: 201 });
      expect(url.pathname).toBe('/rest/v1/guest_addresses');
      return Response.json(result, { status });
    } } });
    database.isSupabaseConfigured = () => true;
    const handlers = requireModule('../../src/app/api/admin/addresses/route') as typeof import('../../src/app/api/admin/addresses/route');
    const request = (method: string, body: unknown) => new NextRequest('https://www.nateandblake.me/api/admin/addresses', { method, body: JSON.stringify(body) });

    allowed = false;
    for (const method of ['POST', 'PATCH', 'DELETE'] as const) expect((await handlers[method](request(method, {}))).status).toBe(401);
    expect(requests).toHaveLength(0);
    allowed = true;
    for (const method of ['POST', 'PATCH', 'DELETE'] as const) expect((await handlers[method](request(method, { linked_rsvp_id: id }))).status).toBe(400);
    expect(requests).toHaveLength(0);
    expect((await handlers.POST(new NextRequest('https://example.test', { method: 'POST', body: '{' }))).status).toBe(400);
    expect((await handlers.POST(request('POST', fields))).status).toBe(201);
    expect(requests[0].body).toEqual({ ...fields, phone: null, street_address_2: null });
    expect(requests[1].body).toMatchObject({ action: 'address.create', entity_id: id, status: 'success' });

    requests.length = 0;
    expect((await handlers.PATCH(request('PATCH', { ...fields, id, updated_at: record.updated_at }))).status).toBe(200);
    expect(requests[0].url.searchParams.get('id')).toBe('eq.' + id);
    expect(requests[0].url.searchParams.get('updated_at')).toBe('eq.' + record.updated_at);
    expect(requests[0].body).not.toHaveProperty('updated_at');
    expect(requests[0].body).not.toHaveProperty('linked_rsvp_id');
    result = null;
    expect((await handlers.PATCH(request('PATCH', { ...fields, id, updated_at: null }))).status).toBe(409);
    expect(requests.at(-1)?.url.searchParams.get('updated_at')).toBe('is.null');
    result = { code: '23505', message: 'Duplicate' }; status = 409;
    const duplicate = await handlers.POST(request('POST', fields));
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error).toContain('already exists');
    result = { code: 'XX000' }; status = 500;
    expect((await handlers.POST(request('POST', fields))).status).toBe(500);
    result = { id }; status = 200;
    expect((await handlers.DELETE(request('DELETE', { id }))).status).toBe(200);
    expect(requests.filter(r => r.method === 'DELETE').at(-1)?.url.searchParams.get('id')).toBe('eq.' + id);
    result = null;
    expect((await handlers.DELETE(request('DELETE', { id }))).status).toBe(404);
    expect(requests.filter(r => r.url.pathname.endsWith('/admin_audit_events')).every(r => !JSON.stringify(r.body).includes(fields.email))).toBe(true);
  } finally {
    auth.requireAdminAuth = originals.auth;
    database.supabase = originals.client;
    database.isSupabaseConfigured = originals.configured;
    // Later email tests initialize their own synthetic database configuration.
    for (const key of Object.keys(requireModule.cache)) {
      if (!cachedModules.has(key) && key.startsWith(resolve(__dirname, '../../src') + '/')) delete requireModule.cache[key];
    }
  }
});

test('address admin supports create from empty list, edit, errors, cancel and confirmed delete without real writes', async ({ page }, testInfo) => {
  test.skip(!process.env.ADMIN_PASSWORD, 'Requires synthetic ADMIN_PASSWORD');
  const session = await page.request.post('/api/auth', { data: { type: 'admin', password: process.env.ADMIN_PASSWORD } });
  expect(session.ok()).toBe(true);
  let addresses: typeof record[] = [];
  let rejectSave = false;
  let deletes = 0;
  await page.route('**/api/admin/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/admin/addresses') {
      const method = route.request().method();
      if (method === 'GET') return route.fulfill({ json: { addresses } });
      const body = route.request().postDataJSON();
      if (method === 'DELETE') { deletes++; addresses = []; return route.fulfill({ json: { success: true } }); }
      if (rejectSave) return route.fulfill({ status: 409, json: { error: 'An address already exists for this email. Edit that record instead.' } });
      expect(body).not.toHaveProperty('linked_rsvp_id');
      addresses = [{ ...record, ...body }];
      return route.fulfill({ json: { address: addresses[0] } });
    }
    return route.fulfill({ json: { guestTags: {}, invitations: [], tasks: [], stats: {}, tags: [], analysis: { stats: {} } } });
  });
  await page.goto('/admin?tab=addresses');
  await expect(page.getByText('No addresses collected yet')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Add address', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.screenshot({ path: testInfo.outputPath('mobile-address-editor.png') });
  for (const [label, value] of [['Full name', fields.name], ['Email', fields.email], ['Street address', fields.street_address], ['City', fields.city], ['State / province', fields.state], ['ZIP / postal code', fields.postal_code]]) await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByRole('button', { name: 'Save address' }).click();
  await expect(dialog).not.toBeVisible();
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: fields.email, exact: true }) });
  await expect(row).toContainText(fields.street_address);
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const actions = row.getByRole('cell').last();
    await actions.scrollIntoViewIfNeeded();
    const edit = await actions.getByRole('button', { name: 'Edit address for Test Guest' }).boundingBox();
    const remove = await actions.getByRole('button', { name: 'Delete address for Test Guest' }).boundingBox();
    expect(Math.abs(edit!.y - remove!.y)).toBeLessThan(2);
    expect(remove!.x).toBeGreaterThanOrEqual(edit!.x + edit!.width);
    expect(remove!.height).toBe(edit!.height);
    await actions.screenshot({ path: testInfo.outputPath(`address-actions-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await row.getByRole('button', { name: 'Edit address for Test Guest' }).click();
  await dialog.screenshot({ path: testInfo.outputPath('desktop-address-editor.png') });
  await dialog.getByLabel('Apartment / unit (optional)').fill('Unit 2');
  await dialog.getByLabel('Email', { exact: true }).fill('updated@example.test');
  await expect(dialog.getByText(/does not transfer/)).toBeVisible();
  rejectSave = true;
  await dialog.getByRole('button', { name: 'Save address' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already exists');
  await expect(dialog.getByLabel('Apartment / unit (optional)')).toHaveValue('Unit 2');
  rejectSave = false;
  await dialog.getByRole('button', { name: 'Save address' }).click();
  await expect(dialog).not.toBeVisible();
  const edited = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'updated@example.test', exact: true }) });
  await expect(edited).toContainText('Unit 2');
  await edited.getByRole('button', { name: 'Edit address for Test Guest' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(edited.getByRole('button', { name: 'Edit address for Test Guest' })).toBeFocused();
  page.once('dialog', dialog => dialog.dismiss());
  await edited.getByRole('button', { name: 'Delete address for Test Guest' }).click();
  expect(deletes).toBe(0);
  page.once('dialog', dialog => dialog.accept());
  await edited.getByRole('button', { name: 'Delete address for Test Guest' }).click();
  await expect(page.getByText('No addresses collected yet')).toBeVisible();
  expect(deletes).toBe(1);
});
