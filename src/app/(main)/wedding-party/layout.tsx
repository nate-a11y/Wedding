import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Our Wedding Party | Nate & Blake",
  description: "Meet the wonderful people standing beside us on October 31, 2027.",
  path: '/wedding-party',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
