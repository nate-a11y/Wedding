import type { Metadata } from 'next';
import Link from 'next/link';
import { readWelcomeVideoToken } from '@/lib/welcome-video';
import { WelcomePlayer } from './welcome-player';

export const metadata: Metadata = {
  title: 'A little hello from Nate & Blake',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const firstName = readWelcomeVideoToken(token);
  return (
    <main className="min-h-screen bg-[#faf9f6] px-5 py-14 text-[#374225] sm:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-xs tracking-[0.24em] uppercase">Nate &amp; Blake · October 31, 2027</p>
        <h1 style={{ color: '#374225' }} className="mb-4 text-[#374225] font-[family-name:var(--font-heading)] text-4xl sm:text-6xl">A little hello, just for you</h1>
        <p className="mb-9 text-sm leading-relaxed">Thank you for being part of our story. We can’t wait to celebrate with you.</p>
        <WelcomePlayer firstName={firstName} token={firstName && typeof token === 'string' ? token : undefined} />
        <Link className="mt-9 inline-block underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Visit our wedding website</Link>
      </div>
    </main>
  );
}
