import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Registry | Nate & Blake",
  description: "Your presence means the most to us. Find registry information for Nate & Blake here.",
  path: '/registry',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
