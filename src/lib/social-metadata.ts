import type { Metadata } from 'next';

export const SITE_ORIGIN = 'https://www.nateandblake.me';

export function socialMetadata({ title, description, path, image = 'wedding' }: {
  title: string;
  description: string;
  path?: string;
  image?: 'wedding' | 'address';
}): Metadata {
  const url = `${SITE_ORIGIN}/social/${image}-v1.png`;
  const alt = image === 'address'
    ? 'Nate & Blake — Share your mailing address for wedding updates and invitations. October 31, 2027.'
    : 'Nate & Blake — October 31, 2027. The Callaway Jewel, Fulton, Missouri.';
  return {
    title, description,
    ...(path ? { alternates: { canonical: `${SITE_ORIGIN}${path}` } } : {}),
    openGraph: {
      title, description, type: 'website', locale: 'en_US', siteName: 'Nate & Blake Say I Do',
      url: `${SITE_ORIGIN}${path || '/'}`,
      images: [{ url, secureUrl: url, width: 1200, height: 630, type: 'image/png', alt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url, alt }] },
  };
}
