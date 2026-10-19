import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding RSVP | Nate & Blake",
  description: "Wedding RSVP information for Nate & Blake’s celebration on October 31, 2027.",
  path: '/rsvp',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
