import type { WeddingCalendarEvent } from '@/lib/calendar';

export interface GuestEvent {
  slug: string;
  name: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  description: string;
  calendarEvent?: WeddingCalendarEvent;
}
