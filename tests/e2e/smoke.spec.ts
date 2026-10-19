import { expect, test } from '@playwright/test';

const adminPassword = process.env.ADMIN_PASSWORD;

test.describe('wedding app smoke', () => {
  test('general wedding pages are public without a password', async ({ page }) => {
    for (const path of ['/', '/rsvp', '/guestbook', '/photos', '/wedding-party']) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    }
  });

  test('admin APIs reject unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test.describe('admin password flow', () => {
    test.skip(!adminPassword, 'ADMIN_PASSWORD is required for admin password smoke test');

    test('admin can log in and load dashboard shell', async ({ page }) => {
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
});
