import { expect, test } from '@playwright/test';

const sitePassword = process.env.SITE_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD;

test.describe('wedding app smoke', () => {
  test('guest can log in and access core public pages', async ({ page }) => {
    test.skip(!sitePassword, 'SITE_PASSWORD is required for guest smoke test');

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/password/i).fill(sitePassword!);
    await page.getByRole('button', { name: /enter|sign in|login/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: /rsvp/i })).toBeVisible();

    await page.goto('/rsvp');
    await expect(page).toHaveURL(/\/rsvp/);
    await expect(page.getByText(/rsvp/i).first()).toBeVisible();

    await page.goto('/guestbook');
    await expect(page).toHaveURL(/\/guestbook/);
    await expect(page.getByText(/guest/i).first()).toBeVisible();
  });

  test('admin APIs reject unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
  });

  test('admin can log in and load dashboard shell', async ({ page }) => {
    test.skip(!adminPassword, 'ADMIN_PASSWORD is required for admin smoke test');

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    const adminToggle = page.getByRole('button', { name: /admin/i });
    if (await adminToggle.isVisible().catch(() => false)) {
      await adminToggle.click();
    }

    await page.getByLabel(/password/i).fill(adminPassword!);
    await page.getByRole('button', { name: /enter|sign in|login/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/admin|dashboard|planner/i).first()).toBeVisible();
  });
});
