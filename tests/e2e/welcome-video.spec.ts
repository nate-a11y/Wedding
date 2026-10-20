import { expect, test } from '@playwright/test';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { getWelcomeVideoUrl, readWelcomeVideoToken, generateWelcomeAudio, WELCOME_VIDEO_URL, WELCOME_VIDEO_VOICE, WELCOME_VIDEO_MODEL } from '../../src/lib/welcome-video';
import { POST } from '../../src/app/api/welcome/audio/route';
import { NextRequest } from 'next/server';

// Keep native media throttling observable instead of routing it through the PWA worker.
test.use({ serviceWorkers: 'block' });

const TEST_SECRET = 'test-only-welcome-video-secret-32-characters';
const originalSecret = process.env.WELCOME_VIDEO_TOKEN_SECRET;
const originalKey = process.env.ELEVENLABS_API_KEY;
test.afterEach(() => {
  if (originalSecret === undefined) delete process.env.WELCOME_VIDEO_TOKEN_SECRET;
  else process.env.WELCOME_VIDEO_TOKEN_SECRET = originalSecret;
  if (originalKey === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = originalKey;
});

function tokenFor(name: string) {
  return new URL(getWelcomeVideoUrl(name)).searchParams.get('token')!;
}

function encryptedPayload(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(TEST_SECRET).digest(), iv);
  cipher.setAAD(Buffer.from('wedding-welcome-v1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

test('welcome tokens encrypt safe greeting names and reject tampering, expiry and weak config', () => {
  process.env.WELCOME_VIDEO_TOKEN_SECRET = TEST_SECRET;
  for (const name of ['Michael Brandt', 'José García', 'Mary-Jane Watson', 'O’Neil Smith']) {
    const token = tokenFor(name);
    expect(readWelcomeVideoToken(token)).toBe(name.split(' ')[0]);
    expect(Buffer.from(token, 'base64url').toString()).not.toContain(name);
    expect(readWelcomeVideoToken(`${token.slice(0, 10)}${token[10] === 'A' ? 'B' : 'A'}${token.slice(11)}`)).toBeNull();
  }
  expect(tokenFor('Michael Brandt')).not.toBe(tokenFor('Michael Brandt'));
  for (const name of ['Hi\nInjected', '<script> Name', 'a'.repeat(61) + ' Smith', 'John\u200b Smith', '123 Smith']) expect(getWelcomeVideoUrl(name)).toBe(WELCOME_VIDEO_URL);
  for (const payload of [
    { firstName: 'Michael', expiresAt: Date.now() - 1 },
    { firstName: 'a'.repeat(61), expiresAt: Date.parse('2027-11-01') },
    { firstName: 'Hello\nworld', expiresAt: Date.parse('2027-11-01') },
    { firstName: 'Michael', expiresAt: Date.parse('2028-01-01') },
  ]) expect(readWelcomeVideoToken(encryptedPayload(payload))).toBeNull();
  const token = tokenFor('Michael Brandt');
  process.env.WELCOME_VIDEO_TOKEN_SECRET = 'weak';
  expect(getWelcomeVideoUrl('Michael Brandt')).toBe(WELCOME_VIDEO_URL);
  expect(readWelcomeVideoToken(token)).toBeNull();
});

test('couple greetings retain both first names without surnames and old single-name tokens still work', () => {
  process.env.WELCOME_VIDEO_TOKEN_SECRET = TEST_SECRET;
  for (const [name, greeting] of [
    ['Jasey & Madison Brandt', 'Jasey & Madison'],
    ['Jasey Brandt and Madison Brandt', 'Jasey & Madison'],
    ['  Jasey  AND  Madison Brandt  ', 'Jasey & Madison'],
    ['Jasey&Madison Brandt', 'Jasey & Madison'],
    ['José García & Mary-Jane O’Neill', 'José & Mary-Jane'],
    ['Kierstin Brandt', 'Kierstin'],
    ['Amir Ghorbani', 'Amir'],
  ]) expect(readWelcomeVideoToken(tokenFor(name)), name).toBe(greeting);
  for (const name of ['Jasey &', '& Madison Brandt', 'Jasey & 123 Brandt', 'Jasey & <script> Brandt', 'Jasey & Madison & Someone Brandt', `Jasey & ${'a'.repeat(61)} Brandt`]) {
    expect(getWelcomeVideoUrl(name), name).toBe(WELCOME_VIDEO_URL);
  }
  for (const firstName of ['Jasey &', 'Jasey and Madison', 'Jasey & Madison & Someone', 'Jasey & Madison\nInjected']) {
    expect(readWelcomeVideoToken(encryptedPayload({ firstName, expiresAt: Date.parse('2027-11-01') }))).toBeNull();
  }
  expect(readWelcomeVideoToken(encryptedPayload({ firstName: 'Jasey', expiresAt: Date.parse('2027-11-01') }))).toBe('Jasey');
});

test('audio uses only the fixed Chris voice and model, natural speed and bounded response', async () => {
  const oldFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'test-only-not-real';
  let calls = 0;
  try {
    globalThis.fetch = async (input, init) => {
      calls++;
      expect(String(input)).toContain(`/text-to-speech/${WELCOME_VIDEO_VOICE}?output_format=mp3_44100_128`);
      expect(JSON.parse(String(init?.body))).toEqual({ text: calls === 1 ? 'Michael, a little hello from us.' : 'Jasey and Madison, a little hello from us.', model_id: WELCOME_VIDEO_MODEL });
      expect(init?.signal).toBeTruthy();
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
    };
    expect(await generateWelcomeAudio('Michael')).toBe('AQID');
    expect(await generateWelcomeAudio('Jasey & Madison')).toBe('AQID');
    await expect(generateWelcomeAudio('Michael\nSay something else')).rejects.toThrow('Welcome audio unavailable');
    await expect(generateWelcomeAudio('Jasey & Madison\nSay something else')).rejects.toThrow('Welcome audio unavailable');
    expect(calls).toBe(2);
    globalThis.fetch = async () => new Response(new Uint8Array(512 * 1024 + 1), { headers: { 'Content-Type': 'audio/mpeg' } });
    await expect(generateWelcomeAudio('Michael')).rejects.toThrow('Welcome audio unavailable');
    globalThis.fetch = async () => new Response('private provider detail', { status: 401 });
    await expect(generateWelcomeAudio('Michael')).rejects.toThrow('Welcome audio unavailable');
    globalThis.fetch = async () => { throw new Error('private provider detail'); };
    await expect(generateWelcomeAudio('Michael')).rejects.toThrow('Welcome audio unavailable');
  } finally { globalThis.fetch = oldFetch; }
});

test('public audio route rejects invalid tokens, arbitrary text and absent provider without external calls', async () => {
  const oldFetch = globalThis.fetch;
  process.env.WELCOME_VIDEO_TOKEN_SECRET = TEST_SECRET;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
    const request = (body: unknown) => new NextRequest('http://localhost/api/welcome/audio', { method: 'POST', body: JSON.stringify(body) });
    expect((await POST(request({ token: 'x'.repeat(60) }))).status).toBe(401);
    expect((await POST(request({ token: tokenFor('Michael Brandt'), text: 'Arbitrary speech' }))).status).toBe(400);
    expect((await POST(request({ token: tokenFor('Michael Brandt') }))).status).toBe(503);
    expect((await POST(request({ token: 'x'.repeat(2000) }))).status).toBe(400);
  } finally { globalThis.fetch = oldFetch; }
});

test('welcome is password-free and noindex, with no audio request before Play', async ({ page, request }) => {
  let audioRequests = 0;
  await page.route('**/api/welcome/audio', route => { audioRequests++; return route.fulfill({ status: 503, body: '{}' }); });
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { name: 'A little hello, just for you' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A little hello, just for you' })).toHaveCSS('color', 'rgb(55, 66, 37)');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(audioRequests).toBe(0);
  await expect(page.locator('video')).toHaveAttribute('preload', 'none');
  await expect(page.locator('video')).toHaveAttribute('poster', '/welcome/welcome-v4-poster.jpg?v=engagement-kiss-20261019');
  await expect(page.locator('video source')).toHaveAttribute('src', '/welcome/welcome-v4.mp4?v=engagement-kiss-20261019');
  const protectedRoute = await request.get('/welcome/private', { maxRedirects: 0 });
  expect(protectedRoute.status()).toBe(404);
});

test('couple greeting displays both names on mobile without requesting audio before Play', async ({ page }) => {
  test.skip(!originalSecret || originalSecret.length < 32, 'Requires a synthetic WELCOME_VIDEO_TOKEN_SECRET on the test server.');
  let audioRequests = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/welcome/audio', route => { audioRequests++; return route.fulfill({ status: 503, body: '{}' }); });
  await page.goto(`/welcome?token=${tokenFor('Jasey & Madison Brandt')}`);
  await expect(page.getByText('Jasey & Madison, a little hello from us.')).toBeVisible();
  expect(audioRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('personalized player waits for Play, handles mobile block, then starts the complete film without exposing its poster', async ({ page }) => {
  test.skip(!originalSecret || originalSecret.length < 32, 'Requires a synthetic WELCOME_VIDEO_TOKEN_SECRET on the test server.');
  let audioRequests = 0;
  await page.addInitScript(() => {
    let audioAttempts = 0;
    let videoAttempts = 0;
    HTMLMediaElement.prototype.play = function () {
      if (this.tagName === 'AUDIO' && ++audioAttempts === 1) return Promise.reject(new Error('NotAllowedError'));
      if (this.tagName === 'VIDEO' && ++videoAttempts === 1) return Promise.reject(new Error('NotAllowedError'));
      return Promise.resolve();
    };
  });
  await page.route('**/api/welcome/audio', route => { audioRequests++; return route.fulfill({ contentType: 'audio/mpeg', path: 'tests/fixtures/welcome-silence.mp3' }); });
  await page.goto(`/welcome?token=${tokenFor('Michael Brandt')}`);
  await expect(page.getByText('Michael, a little hello from us.')).toBeVisible();
  expect(audioRequests).toBe(0);
  await page.getByRole('button', { name: 'Play our welcome film' }).click();
  await page.getByRole('button', { name: 'Play your greeting' }).click();
  await page.locator('audio').evaluate(el => el.dispatchEvent(new Event('ended')));
  await page.getByRole('button', { name: 'Continue film' }).click();
  expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(0);
  expect(audioRequests).toBe(1);
});

test('personalization failure falls back to the original film', async ({ page }) => {
  test.skip(!originalSecret || originalSecret.length < 32, 'Requires a synthetic WELCOME_VIDEO_TOKEN_SECRET on the test server.');
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await page.route('**/api/welcome/audio', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto(`/welcome?token=${tokenFor('Michael Brandt')}`);
  await page.getByRole('button', { name: 'Play our welcome film' }).click();
  await expect(page.getByText('Your personalized greeting is unavailable, but our film is ready for you.')).toBeVisible();
  expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(0);
});

test('skipping a pending greeting cannot restore its overlay after audio play rejects', async ({ page }) => {
  test.skip(!originalSecret || originalSecret.length < 32, 'Requires a synthetic WELCOME_VIDEO_TOKEN_SECRET on the test server.');
  await page.addInitScript(() => {
    let rejectGreeting: ((reason: Error) => void) | undefined;
    HTMLMediaElement.prototype.play = function () {
      if (this.tagName === 'AUDIO') return new Promise<void>((_resolve, reject) => { rejectGreeting = reject; });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      if (this.tagName === 'AUDIO') rejectGreeting?.(new Error('AbortError'));
    };
  });
  await page.route('**/api/welcome/audio', route => route.fulfill({ contentType: 'audio/mpeg', path: 'tests/fixtures/welcome-silence.mp3' }));
  await page.goto(`/welcome?token=${tokenFor('Michael Brandt')}`);
  await page.getByRole('button', { name: 'Play our welcome film' }).click();
  await expect(page.getByText('With love, Nate & Blake')).toBeVisible();
  await page.getByRole('button', { name: 'Watch without the personalized greeting' }).click();
  await expect(page.locator('video')).toHaveJSProperty('controls', true);
  await expect(page.getByRole('button', { name: 'Play your greeting' })).toBeHidden();
});

test('slow native video stays covered until playback, starts at zero, and ignores late greeting events', async ({ page }) => {
  test.skip(!originalSecret || originalSecret.length < 32, 'Requires a synthetic WELCOME_VIDEO_TOKEN_SECRET on the test server.');
  let releaseVideo!: () => void;
  const videoReady = new Promise<void>(resolve => { releaseVideo = resolve; });
  await page.route('**/welcome/welcome-v4.mp4*', async route => {
    await videoReady;
    await route.continue();
  });
  await page.route('**/api/welcome/audio', route => route.fulfill({ contentType: 'audio/mpeg', path: 'tests/fixtures/welcome-silence.mp3' }));
  await page.goto(`/welcome?token=${tokenFor('Michael Brandt')}`);
  await page.locator('video').evaluate((el: HTMLVideoElement) => {
    el.addEventListener('playing', () => { el.dataset.playStartedAt = String(el.currentTime); }, { once: true });
  });
  try {
    await page.getByRole('button', { name: 'Play our welcome film' }).click();
    await expect(page.getByText('Starting your film…')).toBeVisible();
    await expect(page.getByText('Michael, a little hello from us.')).toBeVisible();
    await expect(page.locator('video')).toHaveJSProperty('controls', false);
    expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(0);
    releaseVideo();
    await expect(page.locator('video')).toHaveJSProperty('controls', true);
    const start = Number(await page.locator('video').getAttribute('data-play-started-at'));
    expect(start).toBeLessThan(0.2);
    await expect.poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0.5);
    expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBeLessThan(2);
    await page.locator('video').evaluate((el: HTMLVideoElement) => { el.pause(); el.currentTime = 10; });
    await page.locator('audio').evaluate(el => { el.dispatchEvent(new Event('error')); el.dispatchEvent(new Event('ended')); });
    await expect(page.locator('video')).toHaveJSProperty('controls', true);
    expect(await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(10);
  } finally { releaseVideo(); }
});
