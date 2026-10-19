import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Photo Booth | Nate & Blake",
  description: "Share your favorite moments and browse photos from our celebration.",
  path: '/photos',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
