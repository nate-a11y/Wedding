import { expect, test } from '@playwright/test';
import { parseGoogleAddress, validateGoogleAddress } from '../../src/lib/address-validation';
import { addressValidationSchema } from '../../src/lib/validation';

const input = { street_address: '1600 Pennsylvania Ave NW', street_address_2: '', city: 'Washington', state: 'DC', postal_code: '20500' };
const fixture = () => ({ result: {
  verdict: { addressComplete: true, validationGranularity: 'PREMISE', hasUnconfirmedComponents: false },
  address: { postalAddress: { addressLines: ['1600 Pennsylvania Avenue Northwest'], locality: 'Washington', administrativeArea: 'DC', postalCode: '20500-0005' } },
  uspsData: { dpvConfirmation: 'Y', standardizedAddress: { firstAddressLine: '1600 PENNSYLVANIA AVE NW', city: 'WASHINGTON', state: 'DC', zipCode: '20500', zipCodeExtension: '0005' } },
} });

test('Google normalization adds ZIP+4 and preserves secondary address', () => {
  const result = parseGoogleAddress(fixture(), input);
  expect(result).toMatchObject({ is_valid: true, is_standardized: true, postal_code: '20500-0005' });
  expect(parseGoogleAddress(fixture(), { ...input, street_address_2: 'Suite 1' }).street_address_2).toBe('Suite 1');
  expect(parseGoogleAddress(fixture(), { ...input, ...result }).is_standardized).toBe(false);
});

test('missing units, unconfirmed components and incomplete matches are not verified', () => {
  for (const confirmation of ['D', 'S', 'N', '']) {
    const data = fixture(); data.result.uspsData.dpvConfirmation = confirmation;
    expect(parseGoogleAddress(data, input).is_valid).toBe(false);
  }
  const data = fixture(); data.result.verdict.hasUnconfirmedComponents = true;
  expect(parseGoogleAddress(data, input).is_valid).toBe(false);
  data.result.verdict.hasUnconfirmedComponents = false;
  data.result.verdict.addressComplete = false;
  expect(parseGoogleAddress(data, input).is_valid).toBe(false);
  expect(() => parseGoogleAddress({}, input)).toThrow();
});

test('unit-only and state corrections require confirmation', () => {
  const data = fixture();
  Object.assign(data.result.uspsData.standardizedAddress, { secondAddressLine: 'APT 2' });
  expect(parseGoogleAddress(data, { ...input, postal_code: '20500-0005', street_address_2: 'APT 1' }).is_standardized).toBe(true);
});

test('input validation rejects missing, oversized and malformed address fields', () => {
  expect(addressValidationSchema.safeParse(input).success).toBe(true);
  for (const data of [{}, { ...input, street_address: 'x'.repeat(151) }, { ...input, postal_code: 'no' }, { ...input, state: 'Missouri' }]) {
    expect(addressValidationSchema.safeParse(data).success).toBe(false);
  }
});

test('provider request uses server-only header and rejects provider errors', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
  process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY = 'test-placeholder';
  try {
    globalThis.fetch = async (url, init) => {
      expect(String(url)).not.toContain('test-placeholder');
      expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'test-placeholder' });
      expect(JSON.parse(String(init?.body))).toMatchObject({ enableUspsCass: true, address: { regionCode: 'US' } });
      return Response.json(fixture());
    };
    expect((await validateGoogleAddress(input)).is_valid).toBe(true);
    globalThis.fetch = async () => new Response('', { status: 403 });
    await expect(validateGoogleAddress(input)).rejects.toThrow('HTTP 403');
    delete process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
    await expect(validateGoogleAddress(input)).rejects.toThrow('not configured');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
    else process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY = originalKey;
  }
});

test('public validation rejects malformed input and privacy is accessible', async ({ request }) => {
  expect((await request.post('/api/address/validate', { data: {} })).status()).toBe(400);
  expect((await request.post('/api/address/validate', { data: 'not json' })).status()).toBe(400);
  expect((await request.get('/privacy')).status()).toBe(200);
});

test('address form offers corrections and explicit unverified fallback without saving', async ({ page }) => {
  await page.route('**/api/address/validate', route => route.fulfill({ json: parseGoogleAddress(fixture(), input) }));
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js**', route => route.fulfill({
    contentType: 'application/javascript',
    body: "window.turnstile = { render: function(el, options) { setTimeout(function() { options.callback('test-placeholder'); }, 0); return 'test-widget'; }, reset: function() {}, remove: function() {} };",
  }));
  await page.goto('/address');
  await page.getByLabel('Full Name').fill('Test Guest');
  await page.getByLabel('Email', { exact: false }).first().fill('test@example.com');
  await page.getByLabel('Phone', { exact: false }).first().fill('2025550100');
  await page.getByLabel('Street Address', { exact: true }).fill(input.street_address);
  await page.getByLabel('City', { exact: true }).fill(input.city);
  await page.locator('select[name="state"]').selectOption(input.state);
  await page.getByLabel(/ZIP|Postal Code/i).fill(input.postal_code);
  const submit = page.getByRole('button', { name: 'Submit Address' });
  let saved = false;
  await page.route('**/api/address', route => { saved = true; return route.abort(); });
  await submit.click();
  await expect(page.getByRole('button', { name: 'Use Suggested Address' })).toBeVisible();
  await page.keyboard.press('Escape');
  // Close existing modal via its backdrop, without accepting or submitting.
  await page.locator('.fixed.inset-0').last().click({ position: { x: 2, y: 2 } });
  await page.route('**/api/address/validate', route => route.fulfill({ status: 503, json: { validation_unavailable: true } }));
  await submit.click();
  await expect(page.getByRole('button', { name: 'Continue without verification' })).toBeVisible();
  expect(saved).toBe(false);
});
