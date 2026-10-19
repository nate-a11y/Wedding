import { expect, test } from '@playwright/test';


// Keep mocked gallery responses in the page routing layer, not the PWA worker.
test.use({ serviceWorkers: 'block' });

test.describe('guest design polish', () => {
  test('hero names and primary actions fit narrow phones and desktop', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-18T12:00:00'));
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto('/');
      const title = page.getByRole('heading', { name: 'Nate and Blake' });
      await expect(title).toBeVisible();
      expect(await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(16);
      const action = page.getByRole('link', { name: 'Share Your Mailing Address', exact: true });
      await expect(action).toHaveAttribute('href', '/address');
      await expect(action).toBeVisible();
      expect(await action.locator('button').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await title.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
  });

  test('hero action follows the existing RSVP window without opening RSVP early', async ({ page }) => {
    for (const [date, name, href] of [
      ['2027-03-31T12:00:00', 'Share Your Mailing Address', '/address'],
      ['2027-04-01T12:00:00', 'RSVP', '/rsvp'],
      ['2027-09-01T12:00:00', 'RSVP', '/rsvp'],
      ['2027-09-02T12:00:00', 'View Wedding Details', '/events'],
    ]) {
      await page.clock.setFixedTime(new Date(date));
      await page.goto('/');
      await expect(page.locator('section').first().getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    await page.clock.setFixedTime(new Date('2026-10-18T12:00:00'));
    await page.goto('/rsvp');
    await expect(page.getByRole('heading', { name: 'Coming Soon' })).toBeVisible();
  });

  test('desktop dropdowns support keyboard disclosure, Escape and outside dismissal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'The Day', exact: true });
    await toggle.focus(); await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.press('Tab');
    const events = page.getByRole('link', { name: 'Events', exact: true });
    await expect(events).toBeFocused();
    await events.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('heading', { name: 'Nate and Blake' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.hover();
    await expect(events).toBeVisible();
  });

  test('homepage stops recurring motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nate and Blake' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length)).toBe(0);
  });

  test('short-phone menu scrolls internally and Escape restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const toggle = page.getByRole('button', { name: 'The Day', exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const registry = page.locator('header').getByRole('link', { name: 'Registry', exact: true });
    await registry.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await registry.boundingBox())!.y + (await registry.boundingBox())!.height).toBeLessThanOrEqual(667);
    expect(await page.locator('header').evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(667);
    await registry.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });
});

test('shared placeholders are readable and inputs keep mobile-safe font sizes', async ({ page }) => {
  await page.goto('/address');
  const input = page.getByLabel('Full Name', { exact: true });
  const styles = await input.evaluate(element => ({ placeholder: getComputedStyle(element, '::placeholder').color, background: getComputedStyle(element).backgroundColor, font: getComputedStyle(element).fontSize }));
  const luminance = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
  expect((luminance(styles.placeholder) + 0.05) / (luminance(styles.background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  expect(parseFloat(styles.font)).toBeGreaterThanOrEqual(16);
});

test('reduced motion removes recurring decorations without hiding content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/address', '/privacy']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length)).toBe(0);
  }
});

test.describe('uncropped guest galleries', () => {
  test('portrait, landscape and transparent art retain natural proportions in both galleries', async ({ page }) => {
    const shapes = [{ name: 'Portrait', width: 400, height: 800 }, { name: 'Landscape', width: 1200, height: 600 }, { name: 'Transparent logo', width: 600, height: 600 }];
    await page.route('**/qa-image-*', route => {
      const shape = shapes.find(item => route.request().url().includes(item.name.split(' ')[0]))!;
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}"><rect x="10" y="10" width="${shape.width - 20}" height="${shape.height - 20}" fill="none" stroke="black" stroke-width="10"/><text x="20" y="80" font-size="32">${shape.name}</text></svg>` });
    });
    let thumbnails = 0;
    await page.route('**/cropped-thumbnail*', route => { thumbnails++; return route.abort(); });
    const photos = shapes.map((shape, index) => ({ id: String(index), guest_name: shape.name, caption: shape.name, category: 'moments', width: index === 0 ? null : shape.width, height: index === 0 ? null : shape.height, display_url: `/qa-image-${shape.name.split(' ')[0]}`, url: `/qa-image-${shape.name.split(' ')[0]}`, full_url: `/qa-image-${shape.name.split(' ')[0]}`, thumbnail_url: '/cropped-thumbnail', created_at: '2026-10-18T12:00:00Z' }));
    await page.route('**/api/photos', route => route.fulfill({ json: { photos } }));
    await page.route('**/api/gallery', route => route.fulfill({ json: { photos } }));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/photos', '/gallery']) {
        await page.goto(path);
        for (const shape of shapes) {
          const tile = path === '/photos' ? page.getByRole('button', { name: `View photo by ${shape.name}`, exact: true }) : page.getByRole('button', { name: shape.name, exact: true });
          const image = tile.locator('img');
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
          const ratio = await image.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.width / rect.height; });
          expect(ratio).toBeCloseTo(shape.width / shape.height, 1);
          if (shape.name === 'Transparent logo') await expect(tile).toHaveCSS('background-color', 'rgb(250, 249, 246)');
          await tile.click();
          const dialog = page.getByRole('dialog', { name: 'Photo viewer' });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByRole('button', { name: 'Close photo viewer' })).toBeFocused();
          await page.keyboard.press('Shift+Tab');
          expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(tile).toBeFocused();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    }
    expect(thumbnails).toBe(0);
  });
});
