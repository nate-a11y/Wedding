import { expect, test } from '@playwright/test';
import { fullNameSchema } from '../../src/lib/name-validation';
import { addressSubmissionSchema, rsvpSubmissionSchema } from '../../src/lib/validation';

test('full names support middle names, punctuation, Unicode, and extra spacing', () => {
  for (const name of ['Michael Brandt', 'Mary-Jane Watson', "Sean O'Neill", 'José García', 'Anne Marie van der Berg', '李 小龍', '  Michael   Brandt  ']) {
    expect(fullNameSchema.safeParse(name).success, name).toBe(true);
  }
  for (const name of ['', 'Michael', '  Michael  ', 'Michael -', 'Michael 123', '123 456', 'A '.repeat(61)]) {
    expect(fullNameSchema.safeParse(name).success, name).toBe(false);
  }
});

test('both submission schemas reject first-name-only input', () => {
  const address = { name: 'Michael', email: 'test@example.com', phone: '2025550100', streetAddress: '1600 Pennsylvania Ave NW', city: 'Washington', state: 'DC', postalCode: '20500' };
  const rsvp = { name: 'Michael', email: 'test@example.com', attending: true };
  expect(addressSubmissionSchema.safeParse(address).success).toBe(false);
  expect(rsvpSubmissionSchema.safeParse(rsvp).success).toBe(false);
  expect(addressSubmissionSchema.safeParse({ ...address, name: 'Michael Brandt' }).success).toBe(true);
  expect(rsvpSubmissionSchema.safeParse({ ...rsvp, name: 'Michael Brandt' }).success).toBe(true);
});

test('address form provides native first-and-last validation before submitting', async ({ page }) => {
  await page.goto('/address');
  const name = page.getByLabel('Full Name', { exact: true });
  await name.fill('Michael');
  expect(await name.evaluate((el: HTMLInputElement) => el.validity.patternMismatch)).toBe(true);
  await expect(page.getByText('Please include your first and last name.')).toBeVisible();
  for (const value of ['Michael Brandt', 'Mary-Jane O’Neill', 'José García']) {
    await name.fill(value);
    expect(await name.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
  }
});
