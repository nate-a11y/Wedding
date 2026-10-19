import { socialMetadata } from '@/lib/social-metadata';

export const metadata = socialMetadata({
  title: "Wedding Song Requests | Nate & Blake",
  description: "Help us build the soundtrack to our celebration. Suggest a song and vote for your favorites.",
  path: '/songs',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
