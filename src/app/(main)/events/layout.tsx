import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Events | Nate & Blake",
  description: "See our wedding-day schedule for October 31, 2027 and sign in to view your personal invitations.",
  path: '/events',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
