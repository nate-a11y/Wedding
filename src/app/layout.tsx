import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nate & Blake Say I Do | October 31, 2027',
  description: 'Join us in celebrating the wedding of Nate Bullock and Blake Moore on October 31, 2027.',
  keywords: ['wedding', 'Nate Bullock', 'Blake Moore', 'October 31 2027'],
  authors: [{ name: 'Nate & Blake' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'N&B Wedding',
  },
  openGraph: {
    title: 'Nate & Blake Say I Do',
    description: 'Join us in celebrating our wedding on October 31, 2027.',
    type: 'website',
    locale: 'en_US',
  },
  icons: {
    icon: '/icons/guest-icon-192.png',
    apple: '/icons/guest-icon-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
