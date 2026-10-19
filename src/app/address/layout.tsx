import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Share Your Mailing Address | Nate & Blake",
  description: "Share your current mailing address so we can send wedding updates and invitations. Nate & Blake · October 31, 2027.",
  path: '/address',
  image: 'address',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
