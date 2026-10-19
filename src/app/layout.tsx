import { socialMetadata, SITE_ORIGIN } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { PWAManifest } from '@/components/PWAManifest';
import { MotionPreferences } from '@/components/ui/MotionPreferences';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  ...socialMetadata({
    title: 'Nate & Blake Say I Do | October 31, 2027',
    description: 'Join us in celebrating the wedding of Nate Bullock and Blake Moore on October 31, 2027.',
  }),
  icons: {
    icon: [
      { url: '/icons/guest-icon.svg', type: 'image/svg+xml' },
      { url: '/icons/guest-icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/icons/guest-icon-192.png',
  },
  keywords: ['wedding', 'Nate Bullock', 'Blake Moore', 'October 31 2027'],
  authors: [{ name: 'Nate & Blake' }],
  // Note: manifest is set per-route to support separate PWAs for guest and admin

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PWAManifest />
        <MotionPreferences>{children}</MotionPreferences>
        <Analytics />
      </body>
    </html>
  );
}
