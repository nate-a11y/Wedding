import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Dress Code | Nate & Blake",
  description: "What to wear for Nate & Blake’s wedding celebration on October 31, 2027.",
  path: '/dress-code',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
