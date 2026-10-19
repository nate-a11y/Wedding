'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { downloadIcs, getGoogleCalendarUrl } from '@/lib/calendar';
import type { GuestEvent } from '@/types/guest-events';

export function GuestInvitations() {
  const [session, setSession] = useState<{ email: string | null; events: GuestEvent[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/guest/session', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Your invitations could not load. Please refresh and try again.');
        setSession(await response.json());
      }).catch(error => { if (error.name !== 'AbortError') setError(error.message); });
    return () => controller.abort();
  }, []);

  async function signOut() {
    const response = await fetch('/api/guest/verify-link', { method: 'DELETE' });
    if (response.ok) setSession({ email: null, events: [] });
    else setError('Could not sign out. Please try again.');
  }

  return <section aria-labelledby="personal-invitations" className="mx-auto mb-16 max-w-4xl rounded-3xl border border-gold-500/40 bg-black/55 p-6 md:p-8">
    <h2 id="personal-invitations" className="font-heading text-2xl text-gold-400 mb-3">Your invitations</h2>
    {error ? <p role="alert" className="text-cream">{error}</p> : !session ? <p className="text-olive-300">Checking your invitations…</p> : !session.email ? <>
      <p className="text-olive-300 mb-5">Some celebrations are by invitation. Enter your email and we’ll send a private link to the events you’re invited to.</p>
      <Link href="/guest/sign-in" className="inline-flex rounded-lg bg-olive-700 px-5 py-3 font-medium text-cream hover:bg-olive-600">Find my invitations</Link>
    </> : <>
      <p className="text-olive-300 mb-4 break-words">Signed in as {session.email} <button onClick={signOut} className="ml-3 text-gold-400 underline">Use a different email</button></p>
      {session.events.length === 0 && <p className="text-olive-300">The wedding-day schedule is below. If you expected another invitation here, please check with Nate and Blake.</p>}
      <div className="space-y-5">{session.events.map(event => <article key={event.slug} className="rounded-xl border border-olive-700 p-5">
        <h3 className="font-heading text-xl text-cream mb-2">{event.name}</h3>
        {(event.date || event.time) && <p className="text-gold-400 mb-2">{[event.date, event.time].filter(Boolean).join(' · ')}</p>}
        {event.location && <p className="text-cream">{event.location}</p>}
        {event.address && <p className="text-olive-300 text-sm mb-3">{event.address}</p>}
        <p className="text-olive-300">{event.description}</p>
        {event.calendarEvent && <div className="mt-4 flex flex-wrap gap-4 text-sm text-gold-400">
          <a href={getGoogleCalendarUrl(event.calendarEvent)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
          <button onClick={() => downloadIcs([event.calendarEvent!], `nate-blake-${event.slug}.ics`)} className="underline">Add to Apple / Outlook</button>
        </div>}
      </article>)}</div>
    </>}
  </section>;
}
