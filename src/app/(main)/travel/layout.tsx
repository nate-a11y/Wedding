import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Travel & Lodging | Nate & Blake",
  description: "Travel and lodging information for our wedding at The Callaway Jewel in Fulton, Missouri.",
  path: '/travel',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
