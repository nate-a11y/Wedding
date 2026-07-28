// Client-safe helpers for building Google Calendar links and ICS files
// for the wedding weekend schedule.

export interface WeddingCalendarEvent {
  name: string;
  description: string;
  location: string;
  start: string; // ISO timestamp with explicit offset
  end: string;
}

const VENUE = 'The Callaway Jewel, 4910 County Rd 105, Fulton, MO 65251';
const SITE_NOTE = 'Details at nateandblake.me';

export const weddingSchedule: WeddingCalendarEvent[] = [
  {
    name: 'Rehearsal Dinner',
    description: `Wedding party and immediate family only. ${SITE_NOTE}`,
    location: VENUE,
    start: '2027-10-30T17:00:00-05:00',
    end: '2027-10-30T20:00:00-05:00',
  },
  {
    name: 'Ceremony',
    description: `Please be seated by 3:45 PM. ${SITE_NOTE}`,
    location: VENUE,
    start: '2027-10-31T16:00:00-05:00',
    end: '2027-10-31T16:45:00-05:00',
  },
  {
    name: 'Cocktail Hour',
    description: `Drinks and hors d'oeuvres before the reception. ${SITE_NOTE}`,
    location: VENUE,
    start: '2027-10-31T16:45:00-05:00',
    end: '2027-10-31T18:00:00-05:00',
  },
  {
    name: 'Reception',
    description: `Dinner, dancing, and celebration! Dancing kicks off at 8:00 PM. ${SITE_NOTE}`,
    location: VENUE,
    start: '2027-10-31T18:00:00-05:00',
    end: '2027-10-31T22:45:00-05:00',
  },
  {
    name: 'Send-off',
    description: `Join us for our grand exit! ${SITE_NOTE}`,
    location: VENUE,
    start: '2027-10-31T22:45:00-05:00',
    end: '2027-10-31T23:00:00-05:00',
  },
];

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function getGoogleCalendarUrl(event: WeddingCalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.name} — Nate & Blake's Wedding`,
    dates: `${toIcsUtc(event.start)}/${toIcsUtc(event.end)}`,
    location: event.location,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildVEvent(event: WeddingCalendarEvent): string {
  return [
    'BEGIN:VEVENT',
    `UID:${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@nateandblake.me`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(`${event.name} — Nate & Blake's Wedding`)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    'END:VEVENT',
  ].join('\r\n');
}

export function buildIcs(events: WeddingCalendarEvent[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nate & Blake Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.map(buildVEvent),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(events: WeddingCalendarEvent[], fileName: string): void {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
