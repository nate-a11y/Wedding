import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Livestream | Nate & Blake",
  description: "Celebrate with Nate & Blake from wherever you are. Find wedding livestream information here.",
  path: '/livestream',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
