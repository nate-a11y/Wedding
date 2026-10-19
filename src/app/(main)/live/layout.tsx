import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Day Hub | Nate & Blake",
  description: "Wedding-day updates, photos, music, and celebration with Nate & Blake.",
  path: '/live',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
