import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Our Story | Nate & Blake",
  description: "A look at our story as we count down to our wedding on October 31, 2027.",
  path: '/our-story',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
