import { expect, test, type Locator, type Page } from '@playwright/test';

const sitePassword = process.env.SITE_PASSWORD;
const adminPassword = process.env.ADMIN_PASSWORD;

async function loginAsGuest(page: Page) {
  await page.goto('/');
  if (/\/login/.test(page.url())) {
    await page.getByLabel(/password/i).fill(sitePassword!);
    await page.getByRole('button', { name: /enter|sign in|login|enter site/i }).click();
    await expect(page).toHaveURL(/\/$/);
  }
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login?redirect=/admin');
  await expect(page.getByText(/admin password|wedding planner/i)).toBeVisible();
  await page.getByLabel(/password/i).fill(adminPassword!);
  await page.getByRole('button', { name: /enter|sign in|login|enter site/i }).click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/admin(?:\?|$)/);
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseCssColor(value: string): Rgba | null {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;

  const parts = match[1]
    .split(',')
    .map((part) => part.trim())
    .map((part) => (part.endsWith('%') ? String((Number(part.slice(0, -1)) / 100) * 255) : part));

  const [r, g, b] = parts.slice(0, 3).map(Number);
  const a = parts[3] === undefined ? 1 : Number(parts[3]);

  if ([r, g, b, a].some((part) => Number.isNaN(part))) return null;
  return { r, g, b, a };
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(color: Rgba) {
  return 0.2126 * channelToLinear(color.r)
    + 0.7152 * channelToLinear(color.g)
    + 0.0722 * channelToLinear(color.b);
}

function contrastRatio(foreground: Rgba, background: Rgba) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectElementContrast(locator: Locator, minimumRatio: number) {
  await expect(locator).toBeVisible();

  const contrast = await locator.evaluate((element) => {
    function parseCssColor(value: string) {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;

      const parts = match[1]
        .split(',')
        .map((part) => part.trim())
        .map((part) => (part.endsWith('%') ? String((Number(part.slice(0, -1)) / 100) * 255) : part));
      const [r, g, b] = parts.slice(0, 3).map(Number);
      const a = parts[3] === undefined ? 1 : Number(parts[3]);

      if ([r, g, b, a].some((part) => Number.isNaN(part))) return null;
      return { r, g, b, a };
    }

    let node: Element | null = element;
    let background = null;
    while (node) {
      const color = parseCssColor(window.getComputedStyle(node).backgroundColor);
      if (color && color.a > 0.75) {
        background = color;
        break;
      }
      node = node.parentElement;
    }

    return {
      color: window.getComputedStyle(element).color,
      backgroundColor: background
        ? `rgba(${background.r}, ${background.g}, ${background.b}, ${background.a})`
        : window.getComputedStyle(document.body).backgroundColor,
    };
  });

  const foreground = parseCssColor(contrast.color);
  const background = parseCssColor(contrast.backgroundColor);
  expect(foreground, `Unable to parse foreground color ${contrast.color}`).not.toBeNull();
  expect(background, `Unable to parse background color ${contrast.backgroundColor}`).not.toBeNull();
  expect(contrastRatio(foreground!, background!), `${await locator.textContent()} contrast`).toBeGreaterThanOrEqual(minimumRatio);
}

test.describe('production QA guest smoke coverage', () => {
  test.skip(!sitePassword, 'SITE_PASSWORD is required for authenticated guest production QA coverage');

  test('live hub keeps QR-friendly CTAs readable on desktop and mobile', async ({ page }) => {
    await page.route('**/api/live', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updates: [] }),
      });
    });

    await loginAsGuest(page);
    await page.goto('/live');

    await expect(page.getByRole('heading', { name: /wedding day hub/i })).toBeVisible();
    await expect(page.getByText(/ready for october 31, 2027|live for wedding day/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /add photos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /request a song/i })).toBeVisible();
    await expectElementContrast(page.getByRole('link', { name: /open venue map/i }), 4.5);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectElementContrast(page.getByRole('link', { name: /^photos$/i }), 4.5);
    await expect(page.getByRole('link', { name: /^songs$/i })).toBeVisible();
  });

  test('songs page hero copy and primary voting controls remain readable', async ({ page }) => {
    await page.route('**/api/songs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ songs: [], userVotes: [] }),
      });
    });

    await loginAsGuest(page);
    await page.goto('/songs');

    await expect(page.getByRole('heading', { name: /song requests/i })).toBeVisible();
    await expect(page.getByText('Playlist Requests')).toBeVisible();
    await expect(page.getByText(/vote for your favorites to help us build the perfect wedding playlist/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /enter your email to vote/i })).toBeVisible();
    await expectElementContrast(page.getByRole('button', { name: /^vote$/i }), 4.5);
  });

  test('RSVP existing-response recovery offers private edit-link email flow', async ({ page }) => {
    const rsvpEmail = 'existing-rsvp@example.com';

    await page.route('**/api/rsvp/lookup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'existing_rsvp_token_required',
          hasExistingRsvp: true,
          maskedEmail: 'e***********@example.com',
          invitedEvents: ['ceremony', 'reception'],
          message: 'We found an RSVP for that email. Please use your private RSVP edit link to view or change it.',
        }),
      });
    });
    await page.route('**/api/rsvp/edit-link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          maskedEmail: 'e***********@example.com',
          message: 'If an RSVP exists for that email, a private edit link is on the way.',
        }),
      });
    });

    await loginAsGuest(page);
    await page.clock.setFixedTime(new Date('2027-04-02T12:00:00-05:00'));
    await page.goto('/rsvp');

    await page.getByLabel(/email address/i).fill(rsvpEmail);
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /oops/i })).toBeVisible();
    await expect(page.getByText(/please use your private RSVP edit link/i)).toBeVisible();
    await expect(page.getByText(`Want us to send the private edit link to ${rsvpEmail}?`)).toBeVisible();

    await page.getByRole('button', { name: /email me my private edit link/i }).click();
    await expect(page.getByText(/private edit link is on the way/i)).toBeVisible();
  });
});

test.describe('production QA admin smoke coverage', () => {
  test.skip(!adminPassword, 'ADMIN_PASSWORD is required for authenticated admin production QA coverage');

  test('authenticated admin can load the Ops tab', async ({ page }) => {
    await page.route('**/api/admin/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const fixtures: Record<string, unknown> = {
        '/api/admin/operations': {
          status: 'degraded',
          timestamp: '2026-05-31T12:00:00.000Z',
          checks: {
            sitePassword: true,
            adminPassword: true,
            authSessionSecret: true,
            supabaseUrl: true,
            supabaseServiceRole: false,
            emailProvider: true,
          },
          auditEvents: [],
        },
        '/api/admin/stats': {
          totalRsvps: 0,
          attendingCount: 0,
          notAttendingCount: 0,
          totalGuests: 0,
          totalPhotos: 0,
          totalMessages: 0,
        },
        '/api/admin/expenses': { expenses: [], totals: { totalAmount: 0, totalPaid: 0, totalBalance: 0 } },
        '/api/admin/vendors': { vendors: [], totals: { totalContracted: 0, totalPaid: 0, totalBalance: 0, countBooked: 0, countPaid: 0, countResearching: 0 } },
        '/api/admin/gifts': { gifts: [], totals: { totalCash: 0, totalGifts: 0, thankYouPending: 0 } },
        '/api/admin/tasks': { tasks: [], stats: { total: 0, completed: 0, pending: 0, overdue: 0, upcoming: 0 } },
        '/api/admin/timeline': { events: [] },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures[pathname] ?? {}),
      });
    });
    await page.route('**/api/vendor/token', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tokens: [] }) });
    });

    await loginAsAdmin(page);
    await page.goto('/admin?tab=operations');

    await expect(page.getByRole('button', { name: /ops/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ops control center/i })).toBeVisible();
    await expect(page.getByText(/launch readiness checks and recent admin audit activity/i)).toBeVisible();
    await expect(page.getByText(/system status/i)).toBeVisible();
    await expect(page.getByText(/needs attention|ready/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /recent admin activity/i })).toBeVisible();
  });
});

test.describe('production QA unauthenticated sensitive API coverage', () => {
  const sensitiveRequests: Array<{ method: 'get' | 'post'; path: string; data?: unknown }> = [
    { method: 'get', path: '/api/admin/operations' },
    { method: 'get', path: '/api/admin/rsvps' },
    { method: 'post', path: '/api/admin/live', data: { message: 'should reject', type: 'info' } },
    { method: 'post', path: '/api/vendor/token', data: { vendorName: 'QA Vendor', role: 'planner' } },
  ];

  for (const { method, path, data } of sensitiveRequests) {
    test(`${method.toUpperCase()} ${path} rejects without admin auth`, async ({ request }) => {
      const response = await request[method](path, data === undefined ? { maxRedirects: 0 } : { data, maxRedirects: 0 });
      expect(response.status(), `${method.toUpperCase()} ${path}`).toBeGreaterThanOrEqual(300);
      expect(response.status(), `${method.toUpperCase()} ${path}`).toBeLessThan(500);
      if (response.status() === 401) {
        expect(response.headers()['content-type']).toContain('application/json');
      }
    });
  }
});
