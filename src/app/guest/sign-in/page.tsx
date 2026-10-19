import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GuestSignIn } from '@/components/GuestSignIn';

export const metadata: Metadata = { title: 'Your Invitations — Nate & Blake', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function GuestSignInPage() {
  return <main className="min-h-screen bg-charcoal px-5 py-24 text-cream"><div className="mx-auto max-w-md rounded-2xl border border-olive-700 bg-black/50 p-7"><Suspense fallback={<p>Loading your invitation…</p>}><GuestSignIn /></Suspense></div></main>;
}
