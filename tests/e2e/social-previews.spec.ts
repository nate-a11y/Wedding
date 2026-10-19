import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const slackbot = 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)';

function meta(head: string, key: string): string | undefined {
  return [...head.matchAll(/<meta\b[^>]*>/g)]
    .find(([tag]) => tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`))?.[0]
    .match(/content="([^"]*)"/)?.[1];
}

for (const [path, image, title] of [
  ['/', 'wedding', 'Nate &amp; Blake Say I Do'],
  ['/address', 'address', 'Share Your Mailing Address'],
  ['/events', 'wedding', 'Wedding Events'],
  ['/photos', 'wedding', 'Wedding Photo Booth'],
  ['/guestbook', 'wedding', 'Our Wedding Guest Book'],
  ['/gallery', 'wedding', 'Our Gallery'],
  ['/wedding-party', 'wedding', 'Our Wedding Party'],
  ['/rsvp', 'wedding', 'Wedding RSVP'],
  ['/travel', 'wedding', 'Travel &amp; Lodging'],
  ['/registry', 'wedding', 'Wedding Registry'],
  ['/faq', 'wedding', 'Wedding Questions'],
  ['/our-story', 'wedding', 'Our Story'],
  ['/dress-code', 'wedding', 'Wedding Dress Code'],
  ['/live', 'wedding', 'Wedding Day Hub'],
  ['/livestream', 'wedding', 'Wedding Livestream'],
  ['/songs', 'wedding', 'Wedding Song Requests'],
]) {
  test(`public ${path} serves complete preview metadata to Slack without JavaScript`, async ({ request }) => {
    const response = await request.get(path, { headers: { 'User-Agent': slackbot } });
    expect(response.status()).toBe(200);
    const head = (await response.text()).split('</head>')[0];
    // Slack fetches only enough HTML for preview tags; they must be in the initial head.
    expect(head.length).toBeLessThan(32 * 1024);
    expect(meta(head, 'og:title')).toContain(title);
    expect(meta(head, 'og:description')?.length).toBeGreaterThan(20);
    expect(meta(head, 'og:image')).toBe(`https://www.nateandblake.me/social/${image}-v1.png`);
    expect(meta(head, 'og:image:secure_url')).toBe(meta(head, 'og:image'));
    expect(meta(head, 'og:image:width')).toBe('1200');
    expect(meta(head, 'og:image:height')).toBe('630');
    expect(meta(head, 'og:image:alt')?.length).toBeGreaterThan(20);
    expect(meta(head, 'twitter:card')).toBe('summary_large_image');
    expect(meta(head, 'twitter:image')).toBe(meta(head, 'og:image'));
    expect(head).toContain('/icons/guest-icon-192.png');
    expect(new URL(meta(head, 'og:url')!).href).toBe(new URL(`https://www.nateandblake.me${path}`).href);
  });
}

test('Facebook, X, WhatsApp, Discord, LinkedIn and Apple crawlers receive the same address card', async ({ request }) => {
  for (const userAgent of ['facebookexternalhit/1.1', 'Twitterbot/1.0', 'WhatsApp/2.0', 'Discordbot/2.0', 'LinkedInBot/1.0', 'Applebot/0.1']) {
    const response = await request.get('/address', { headers: { 'User-Agent': userAgent } });
    expect(response.status(), userAgent).toBe(200);
    const head = (await response.text()).split('</head>')[0];
    expect(meta(head, 'og:image'), userAgent).toBe('https://www.nateandblake.me/social/address-v1.png');
    expect(meta(head, 'twitter:card'), userAgent).toBe('summary_large_image');
  }
});

test('both preview PNGs are publicly readable, correctly sized and lightweight', async ({ request }) => {
  for (const name of ['address', 'wedding']) {
    const response = await request.get(`/social/${name}-v1.png`, { headers: { 'User-Agent': 'Slack-ImgProxy 0.19 (+https://api.slack.com/robots)' } });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    const buffer = await response.body();
    expect(buffer.length).toBeLessThan(300_000);
    const metadata = await sharp(buffer).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  }
});

test('private-link previews stay generic, noindex and never copy tokens into metadata', async ({ request }) => {
  for (const path of ['/welcome', '/guest/sign-in']) {
    const token = 'not-a-real-token-for-preview-privacy-check';
    const response = await request.get(`${path}?token=${token}`, { headers: { 'User-Agent': slackbot } });
    expect(response.status()).toBe(200);
    const head = (await response.text()).split('</head>')[0];
    expect(meta(head, 'robots')).toContain('noindex');
    expect(meta(head, 'referrer')).toBe('no-referrer');
    expect(new URL(meta(head, 'og:url')!).href).toBe(new URL(`https://www.nateandblake.me${path}`).href);
    expect(meta(head, 'og:image')).toBe('https://www.nateandblake.me/social/wedding-v1.png');
    expect(head).not.toContain(token);
    expect(head).not.toContain('rehearsal_dinner');
  }
  expect((await request.get('/api/admin/addresses')).status()).toBe(401);
});
