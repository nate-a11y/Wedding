import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Questions | Nate & Blake",
  description: "Find answers to common questions about Nate & Blake’s wedding on October 31, 2027.",
  path: '/faq',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
