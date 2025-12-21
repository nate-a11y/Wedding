'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export function RSVPCard() {
  // RSVP availability window: April 1, 2027 - Sept 1, 2027
  const now = new Date();
  const prodStart = new Date('2027-04-01T00:00:00');
  const prodEnd = new Date('2027-09-01T23:59:59');

  const rsvpOpen = now >= prodStart && now <= prodEnd;
  const rsvpClosed = now > prodEnd;

  return (
    <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
        <svg className="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-heading text-xl text-cream mb-2">RSVP</h3>

      {rsvpOpen ? (
        <>
          <p className="text-gold-400 font-medium mb-3">Now Open!</p>
          <Link href="/rsvp">
            <Button variant="primary" size="sm">
              RSVP Now
            </Button>
          </Link>
        </>
      ) : rsvpClosed ? (
        <>
          <p className="text-olive-400 font-medium">RSVP Closed</p>
          <p className="text-olive-500 text-sm">Thank you for responding!</p>
        </>
      ) : (
        <>
          <p className="text-gold-400 font-medium">Opens April 1, 2027</p>
          <p className="text-olive-400 text-sm">Save the date!</p>
        </>
      )}
    </div>
  );
}
