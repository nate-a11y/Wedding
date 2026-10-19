'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useBotCheck } from '@/hooks/useBotCheck';

export function GuestSignIn() {
  const params = useSearchParams();
  const token = params.get('token');
  const router = useRouter();
  const { protectedFetch, botCheck } = useBotCheck('guest-sign-in');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = token
        ? await fetch('/api/guest/verify-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        : await protectedFetch('/api/guest/request-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Please try again.');
      if (token) { router.replace('/events'); router.refresh(); }
      else { setSent(true); setMessage(data.message); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }

  return <>
    <p className="font-accent text-2xl text-gold-400 mb-3">Nate &amp; Blake</p>
    <h1 className="font-heading text-3xl mb-3">Your invitations</h1>
    <p className="text-olive-300 mb-6">{token ? 'One more tap to open your personal wedding invitations.' : 'Enter the email you shared with us. We’ll email you a private link to your celebrations—no password needed.'}</p>
    <form onSubmit={submit} className="space-y-5">
      {!token && !sent && <Input label="Email address" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />}
      {!sent && <Button type="submit" disabled={busy}>{busy ? 'One moment…' : token ? 'Open my invitations' : 'Email me a sign-in link'}</Button>}
      {message && <p role="status" className="text-sm text-cream">{message}</p>}
    </form>
    {botCheck}
    <div className="mt-6 flex flex-wrap gap-4 text-sm text-gold-400">
      <Link href="/">Browse the wedding website</Link>
      {(token || sent) && <Link href="/guest/sign-in">Request a new link</Link>}
    </div>
  </>;
}
