import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wedding Planner | Nate & Blake',
  description: 'Wedding planning dashboard for Nate & Blake',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Wedding Planner',
  },
  icons: {
    icon: '/icons/admin-icon-192.png',
    apple: '/icons/admin-icon-192.png',
  },
  themeColor: '#536537',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
