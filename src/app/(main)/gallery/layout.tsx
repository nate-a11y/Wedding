import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Our Gallery | Nate & Blake",
  description: "A few favorite moments from our story, leading up to October 31, 2027.",
  path: '/gallery',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
