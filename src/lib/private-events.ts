// Server-only event details: never import this module from a client component.
import type { GuestEvent } from '@/types/guest-events';

const PRIVATE_EVENTS: GuestEvent[] = [
  {
    slug: 'rehearsal_dinner', name: 'Rehearsal Dinner', date: 'October 30, 2027', time: '5:00 PM',
    location: 'The Callaway Jewel', address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Join us the night before for dinner and celebration!',
    calendarEvent: {
      name: 'Rehearsal Dinner', description: 'Dinner and celebration with Nate & Blake. Details at nateandblake.me',
      location: 'The Callaway Jewel, 4910 County Rd 105, Fulton, MO 65251',
      start: '2027-10-30T17:00:00-05:00', end: '2027-10-30T20:00:00-05:00',
    },
  },
  { slug: 'welcome_party', name: 'Welcome Party', description: 'More details to come. We look forward to celebrating with you!' },
  { slug: 'after_party', name: 'After Party', description: 'More details to come. We look forward to celebrating with you!' },
  { slug: 'sunday_brunch', name: 'Sunday Brunch', description: 'More details to come. We look forward to celebrating with you!' },
];

export function privateEventsFor(slugs: string[]): GuestEvent[] {
  return PRIVATE_EVENTS.filter(event => slugs.includes(event.slug));
}
