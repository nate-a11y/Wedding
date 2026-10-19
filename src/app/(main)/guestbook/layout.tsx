import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Our Wedding Guest Book | Nate & Blake",
  description: "Leave us a message, share your wishes, or record a little hello for Nate & Blake.",
  path: '/guestbook',
  image: 'wedding',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
