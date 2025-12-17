'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

// Calendar event details
const calendarEvent = {
  title: 'Nate & Blake\'s Wedding',
  date: '20271031',
  dateEnd: '20271101', // Next day for all-day event
  location: 'The Callaway Jewel, 4910 County Rd 105, Fulton, MO 65251',
  description: 'Join us as we celebrate our wedding! Visit nateandblake.me for details.',
};

// Generate Google Calendar URL
const getGoogleCalendarUrl = () => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarEvent.title,
    dates: `${calendarEvent.date}/${calendarEvent.dateEnd}`,
    location: calendarEvent.location,
    details: calendarEvent.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate ICS file content for Apple/Outlook
const generateICSContent = () => {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nate & Blake Wedding//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:${calendarEvent.date}
DTEND;VALUE=DATE:${calendarEvent.dateEnd}
SUMMARY:${calendarEvent.title}
LOCATION:${calendarEvent.location}
DESCRIPTION:${calendarEvent.description}
END:VEVENT
END:VCALENDAR`;
};

// Download ICS file
const downloadICS = () => {
  const icsContent = generateICSContent();
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nate-blake-wedding.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const events = [
  {
    name: 'Ceremony',
    time: 'Time TBA',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Join us as we exchange vows and begin our journey as a married couple.',
    dressCode: 'Formal attire',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    name: 'Cocktail Hour',
    time: 'Time TBA',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Mix and mingle with fellow guests while enjoying drinks and hors d\'oeuvres.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Reception',
    time: 'Time TBA',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Dinner, dancing, and celebration! Join us for an unforgettable evening.',
    dressCode: 'Formal attire',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
];

export default function EventsPage() {
  return (
    <div className="section-padding bg-charcoal">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">The Big Day</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Wedding Events
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            October 31, 2027 — Mark your calendars! Here&apos;s what to expect on our special day.
          </p>

          {/* Add to Calendar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-olive-800 hover:bg-olive-700 text-cream rounded-lg transition-colors text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-7.5h3V18zm4.5 0h-3v-7.5h3V18zm4.5 0h-3v-7.5h3V18zM19.5 9h-15V4.5h15V9z"/>
              </svg>
              Add to Google Calendar
            </a>
            <button
              onClick={downloadICS}
              className="inline-flex items-center gap-2 px-4 py-2 bg-olive-800 hover:bg-olive-700 text-cream rounded-lg transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Apple/Outlook
            </button>
          </div>
        </motion.div>

        {/* Events */}
        <div className="max-w-4xl mx-auto space-y-8">
          {events.map((event, index) => (
            <motion.div
              key={event.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Left accent */}
                <div className="bg-gradient-to-b from-olive-700 to-olive-800 p-6 md:w-48 flex flex-col items-center justify-center text-cream">
                  <div className="text-gold-400 mb-2">
                    {event.icon}
                  </div>
                  <h3 className="font-heading text-xl text-center">{event.name}</h3>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex-1">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-olive-300 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{event.time}</span>
                      </div>
                      <div className="flex items-start gap-2 text-olive-300">
                        <svg className="w-4 h-4 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="font-medium">{event.location}</p>
                          <p className="text-sm text-olive-400">{event.address}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-olive-300 mb-3">{event.description}</p>
                      {event.dressCode && (
                        <p className="text-sm text-olive-400">
                          <span className="font-medium text-gold-400">Dress Code:</span> {event.dressCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-olive-900/50 border border-olive-700 rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-olive-300">
              <strong className="text-gold-400">Note:</strong> Event times will be
              updated as they are finalized. Check back soon!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
