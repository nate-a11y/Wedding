import { expect, test } from '@playwright/test';
import { addressAutocompleteSchema } from '../../src/lib/validation';
import { addressLocationBias, parsePlaceAddress, resolveAddress, suggestAddresses } from '../../src/lib/address-autocomplete';

const token = '00000000-0000-4000-8000-000000000001';
const suggestion = { placeId: 'public-place-id', text: '1600 Pennsylvania Avenue NW, Washington, DC, USA' };
const address = { street_address: '1600 Pennsylvania Avenue NW', street_address_2: '', city: 'Washington', state: 'DC', postal_code: '20500' };
const place = { addressComponents: [
  { longText: '1600', types: ['street_number'] },
  { longText: 'Pennsylvania Avenue NW', types: ['route'] },
  { longText: 'Washington', types: ['locality'] },
  { longText: 'District of Columbia', shortText: 'DC', types: ['administrative_area_level_1'] },
  { longText: '20500', types: ['postal_code'] },
  { longText: 'United States', shortText: 'US', types: ['country'] },
] };
const canadianSuggestion = { placeId: 'public-canadian-place-id', text: '100 Queen Street West, Toronto, ON, Canada' };
const canadianAddress = { street_address: '100 Queen Street West', street_address_2: '', city: 'Toronto', state: 'ON', postal_code: 'M5H 2N2' };
const canadianPlace = { addressComponents: [
  { longText: '100', types: ['street_number'] },
  { longText: 'Queen Street West', types: ['route'] },
  { longText: 'Toronto', types: ['locality'] },
  { longText: 'Ontario', shortText: 'ON', types: ['administrative_area_level_1'] },
  { longText: 'M5H 2N2', types: ['postal_code'] },
  { longText: 'Canada', shortText: 'CA', types: ['country'] },
] };

test('autocomplete validates action, minimum query, session and place ID', () => {
  expect(addressAutocompleteSchema.safeParse({ action: 'suggest', input: '1600 Penn', sessionToken: token }).success).toBe(true);
  expect(addressAutocompleteSchema.safeParse({ action: 'resolve', placeId: suggestion.placeId, sessionToken: token }).success).toBe(true);
  expect(addressAutocompleteSchema.parse({ action: 'suggest', input: '100 Queen', sessionToken: token, country: 'CA' }).country).toBe('CA');
  expect(addressAutocompleteSchema.parse({ action: 'resolve', placeId: suggestion.placeId, sessionToken: token }).country).toBe('US');
  for (const country of ['invalid', 'Canada', null]) {
    for (const request of [{ action: 'suggest', input: '100 Queen' }, { action: 'resolve', placeId: suggestion.placeId }]) {
      expect(addressAutocompleteSchema.safeParse({ ...request, sessionToken: token, country }).success).toBe(false);
    }
  }
  for (const body of [{}, { action: 'suggest', input: '12', sessionToken: token }, { action: 'resolve', placeId: '../escape', sessionToken: token }, { action: 'suggest', input: '1600 Penn', sessionToken: 'bad' }]) {
    expect(addressAutocompleteSchema.safeParse(body).success).toBe(false);
  }
  expect(parsePlaceAddress(place)).toEqual(address);
  expect(parsePlaceAddress(canadianPlace, 'CA')).toEqual(canadianAddress);
  expect(() => parsePlaceAddress(canadianPlace, 'US')).toThrow('selected country');
  expect(() => parsePlaceAddress(place, 'CA')).toThrow('selected country');
  expect(() => parsePlaceAddress({ addressComponents: [] })).toThrow();
});

test('IP-based location bias validates coordinates without requesting device location', () => {
  const headers = (lat: string, lng: string) => new Headers({ 'x-vercel-ip-latitude': lat, 'x-vercel-ip-longitude': lng });
  expect(addressLocationBias(headers('38.9', '-77.0'))).toEqual({ circle: { center: { latitude: 38.9, longitude: -77 }, radius: 50000 } });
  expect(addressLocationBias(headers('0', '0'))?.circle.center).toEqual({ latitude: 0, longitude: 0 });
  expect(addressLocationBias(new Headers())).toBeUndefined();
  expect(addressLocationBias(new Headers({ 'x-vercel-ip-latitude': '38.9' }))).toBeUndefined();
  for (const [lat, lng] of [['', '0'], [' ', '0'], ['NaN', '0'], ['0', 'Infinity'], ['91', '0'], ['-91', '0'], ['0', '181'], ['0', '-181']]) {
    expect(addressLocationBias(headers(lat, lng))).toBeUndefined();
  }
});

test('Places requests keep keys server-side, bias nearby without restricting location, and request only address components', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
  process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY = 'test-placeholder';
  const bias = addressLocationBias(new Headers({ 'x-vercel-ip-latitude': '38.9', 'x-vercel-ip-longitude': '-77' }));
  let predictions = 0;
  try {
    globalThis.fetch = async (url, init) => {
      expect(String(url)).not.toContain('test-placeholder');
      expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'test-placeholder' });
      if (String(url).includes('autocomplete')) {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({ input: predictions === 2 ? '100 Queen' : '1600 Penn', includedRegionCodes: [predictions === 2 ? 'ca' : 'us'], sessionToken: token, languageCode: 'en', ...(predictions++ === 0 ? { locationBias: bias } : {}) });
        const result = body.includedRegionCodes[0] === 'ca' ? canadianSuggestion : suggestion;
        return Response.json({ suggestions: [{ placePrediction: { placeId: result.placeId, text: { text: result.text } } }] });
      }
      expect(String(url)).toContain(`sessionToken=${token}`);
      expect(init?.headers).toMatchObject({ 'X-Goog-FieldMask': 'addressComponents' });
      return Response.json(String(url).includes(canadianSuggestion.placeId) ? canadianPlace : place);
    };
    expect(await suggestAddresses('1600 Penn', token, 'US', bias)).toEqual([suggestion]);
    expect(await suggestAddresses('1600 Penn', token)).toEqual([suggestion]);
    expect(await resolveAddress(suggestion.placeId, token)).toEqual(address);
    expect(await suggestAddresses('100 Queen', token, 'CA')).toEqual([canadianSuggestion]);
    expect(await resolveAddress(canadianSuggestion.placeId, token, 'CA')).toEqual(canadianAddress);
    await expect(resolveAddress(canadianSuggestion.placeId, token, 'US')).rejects.toThrow('selected country');
    globalThis.fetch = async () => new Response('', { status: 403 });
    await expect(suggestAddresses('1600 Penn', token)).rejects.toThrow('HTTP 403');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
    else process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY = originalKey;
  }
});

test('typing suggestions support keyboard selection, autofill, unit preservation and manual fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: Array<{ action: string; sessionToken: string }> = [];
  await page.route('**/api/address/autocomplete', async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ json: body.action === 'suggest' ? { suggestions: [suggestion] } : { address } });
  });
  await page.goto('/address');
  const street = page.getByRole('combobox', { name: 'Street Address' });
  await page.getByLabel('Apartment, Suite, etc. (Optional)').fill('APT 4B');
  await street.fill('1600 Penn');
  await expect(page.getByRole('option', { name: suggestion.text })).toBeVisible();
  await street.press('ArrowDown'); await street.press('Enter');
  await expect(street).toHaveValue(address.street_address);
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Washington');
  await expect(page.locator('select[name="state"]')).toHaveValue('DC');
  await expect(page.getByLabel('ZIP Code', { exact: true })).toHaveValue('20500');
  await expect(page.getByLabel('Apartment, Suite, etc. (Optional)')).toHaveValue('APT 4B');
  const suggest = requests.find(body => body.action === 'suggest');
  const resolve = requests.find(body => body.action === 'resolve');
  expect(suggest?.sessionToken).toBe(resolve?.sessionToken);
  await page.route('**/api/address/autocomplete', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await street.fill('1600 Pennsylvania');
  await expect(page.getByRole('status').filter({ hasText: 'Suggestions unavailable' })).toBeVisible();
  await expect(street).toHaveValue('1600 Pennsylvania');
  await page.locator('select[name="country"]').selectOption('Ireland');
  await street.fill('International address entered manually');
  await expect(page.getByRole('listbox', { name: 'Address suggestions' })).toHaveCount(0);
});

test('Canadian autocomplete fills province and postal code, preserves units, and uses a fresh country session', async ({ page }) => {
  const requests: Array<{ action: string; sessionToken: string; country: string }> = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/address/autocomplete', async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ json: body.action === 'suggest' ? { suggestions: [body.country === 'CA' ? canadianSuggestion : suggestion] } : { address: canadianAddress } });
  });
  await page.goto('/address');
  const street = page.getByRole('combobox', { name: 'Street Address' });
  await street.fill('1600 Penn');
  await expect(page.getByRole('option', { name: suggestion.text })).toBeVisible();
  const usSession = requests[0].sessionToken;
  await page.locator('select[name="country"]').selectOption('Canada');
  await expect(page.getByText('US and Canadian address searches, plus US mailing details for validation, are shared with Google.')).toBeVisible();
  await page.getByLabel('Apartment, Suite, etc. (Optional)').fill('APT 4B');
  await street.fill('100 Queen');
  await expect(page.getByRole('option', { name: canadianSuggestion.text })).toBeVisible();
  await street.press('ArrowDown'); await street.press('Enter');
  await expect(street).toHaveValue(canadianAddress.street_address);
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Toronto');
  await expect(page.locator('select[name="state"]')).toHaveValue('ON');
  await expect(page.getByLabel('Postal Code', { exact: true })).toHaveValue('M5H 2N2');
  await expect(page.getByLabel('Apartment, Suite, etc. (Optional)')).toHaveValue('APT 4B');
  const suggest = requests.find(body => body.action === 'suggest' && body.country === 'CA');
  const resolve = requests.find(body => body.action === 'resolve');
  expect(suggest?.sessionToken).toBe(resolve?.sessionToken);
  expect(suggest?.sessionToken).not.toBe(usSession);
  expect(resolve?.country).toBe('CA');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('changing country cannot apply an old selected address', async ({ page }) => {
  let releaseDetails: (() => void) | undefined;
  await page.route('**/api/address/autocomplete', async route => {
    if (route.request().postDataJSON().action === 'suggest') {
      await route.fulfill({ json: { suggestions: [suggestion] } });
    } else {
      await new Promise<void>(resolve => { releaseDetails = resolve; });
      await route.fulfill({ json: { address } }).catch(() => {});
    }
  });
  await page.goto('/address');
  const street = page.getByRole('combobox', { name: 'Street Address' });
  await street.fill('1600 Penn');
  await page.getByRole('option', { name: suggestion.text }).click();
  await expect.poll(() => Boolean(releaseDetails)).toBe(true);
  await page.locator('select[name="country"]').selectOption('Canada');
  releaseDetails!();
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('');
  await expect(page.locator('select[name="state"]')).toHaveValue('');
  await expect(street).toHaveValue('1600 Penn');
});

test('a late selected-address response never overwrites newer manual input', async ({ page }) => {
  let releaseDetails: (() => void) | undefined;
  await page.route('**/api/address/autocomplete', async route => {
    if (route.request().postDataJSON().action === 'suggest') {
      await route.fulfill({ json: { suggestions: [suggestion] } });
    } else {
      await new Promise<void>(resolve => { releaseDetails = resolve; });
      await route.fulfill({ json: { address } }).catch(() => {});
    }
  });
  await page.goto('/address');
  const street = page.getByRole('combobox', { name: 'Street Address' });
  await street.fill('1600 Penn');
  await page.getByRole('option', { name: suggestion.text }).click();
  await expect.poll(() => Boolean(releaseDetails)).toBe(true);
  await street.fill('New manual address');
  releaseDetails!();
  await expect(street).toHaveValue('New manual address');
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('');
});
