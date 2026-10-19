import { expect, test } from '@playwright/test';
import { addressAutocompleteSchema } from '../../src/lib/validation';
import { parsePlaceAddress, resolveAddress, suggestAddresses } from '../../src/lib/address-autocomplete';

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

test('autocomplete validates action, minimum query, session and place ID', () => {
  expect(addressAutocompleteSchema.safeParse({ action: 'suggest', input: '1600 Penn', sessionToken: token }).success).toBe(true);
  expect(addressAutocompleteSchema.safeParse({ action: 'resolve', placeId: suggestion.placeId, sessionToken: token }).success).toBe(true);
  for (const body of [{}, { action: 'suggest', input: '12', sessionToken: token }, { action: 'resolve', placeId: '../escape', sessionToken: token }, { action: 'suggest', input: '1600 Penn', sessionToken: 'bad' }]) {
    expect(addressAutocompleteSchema.safeParse(body).success).toBe(false);
  }
  expect(parsePlaceAddress(place)).toEqual(address);
  expect(() => parsePlaceAddress({ addressComponents: [] })).toThrow();
});

test('Places requests keep keys server-side, restrict US and request only address components', async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
  process.env.GOOGLE_ADDRESS_VALIDATION_API_KEY = 'test-placeholder';
  try {
    globalThis.fetch = async (url, init) => {
      expect(String(url)).not.toContain('test-placeholder');
      expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'test-placeholder' });
      if (String(url).includes('autocomplete')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ includedRegionCodes: ['us'], sessionToken: token });
        return Response.json({ suggestions: [{ placePrediction: { placeId: suggestion.placeId, text: { text: suggestion.text } } }] });
      }
      expect(String(url)).toContain(`sessionToken=${token}`);
      expect(init?.headers).toMatchObject({ 'X-Goog-FieldMask': 'addressComponents' });
      return Response.json(place);
    };
    expect(await suggestAddresses('1600 Penn', token)).toEqual([suggestion]);
    expect(await resolveAddress(suggestion.placeId, token)).toEqual(address);
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
  await page.locator('select[name="country"]').selectOption('Canada');
  await street.fill('Canadian address entered manually');
  await expect(page.getByRole('listbox', { name: 'Address suggestions' })).toHaveCount(0);
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
