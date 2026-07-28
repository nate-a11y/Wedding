'use client';

import { motion } from 'framer-motion';
import { PageEffects, AnimatedHeader } from '@/components/ui';
import { weddingSchedule, getGoogleCalendarUrl, downloadIcs } from '@/lib/calendar';

const calendarEventsByName = new Map(weddingSchedule.map((event) => [event.name, event]));

const events = [
  {
    name: 'Rehearsal Dinner',
    time: '5:00 PM',
    date: 'October 30, 2027',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Wedding party and immediate family only. Join us the night before for dinner and celebration!',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Ceremony',
    time: '4:00 PM',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Please be seated by 3:45 PM. Join us as we exchange vows and begin our journey as a married couple.',
    dressCode: 'Formal attire',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    name: 'Cocktail Hour',
    time: '4:45 PM',
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
    time: '6:00 PM',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Dinner, dancing, and celebration! Join us for an unforgettable evening. Dancing kicks off at 8:00 PM.',
    dressCode: 'Formal attire',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    name: 'Send-off',
    time: '10:45 PM',
    location: 'The Callaway Jewel',
    address: '4910 County Rd 105, Fulton, MO 65251',
    description: 'Join us for our grand exit!',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
];

export default function EventsPage() {
  return (
    <div className="section-padding bg-charcoal relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <div className="container-wedding relative z-10">
        {/* Header */}
        <AnimatedHeader
          subtitle="The Big Day"
          title="Wedding Events"
          description="October 31, 2027 — Mark your calendars! Here's what to expect on our special day."
        />

        {/* Add to Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 -mt-8 mb-16"
        >
          <button
            onClick={() => downloadIcs(weddingSchedule, 'nate-blake-wedding-schedule.ics')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-black font-medium rounded-lg transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add Full Schedule to Calendar
          </button>
          <p className="text-olive-400 text-xs sm:ml-2">
            Downloads every event below — works with Apple, Google, and Outlook
          </p>
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
              className="overflow-hidden rounded-3xl border border-olive-700/80 bg-black/55 shadow-elegant backdrop-blur-sm"
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
                      {'date' in event && event.date && (
                        <div className="flex items-center gap-2 text-gold-400 mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{event.date}</span>
                        </div>
                      )}
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
                          <p className="text-sm text-olive-300/80">{event.address}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-olive-300 mb-3">{event.description}</p>
                      {event.dressCode && (
                        <p className="text-sm text-olive-300/80">
                          <span className="font-medium text-gold-400">Dress Code:</span> {event.dressCode}
                        </p>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const calendarEvent = calendarEventsByName.get(event.name);
                    if (!calendarEvent) return null;
                    return (
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-olive-800/60 pt-4">
                        <span className="text-xs uppercase tracking-wider text-olive-500">Add to calendar:</span>
                        <a
                          href={getGoogleCalendarUrl(calendarEvent)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-olive-700 px-3 py-1.5 text-xs text-olive-200 transition-colors hover:border-gold-500/60 hover:text-gold-300"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-7.5h3V18zm4.5 0h-3v-7.5h3V18zm4.5 0h-3v-7.5h3V18zM19.5 9h-15V4.5h15V9z"/>
                          </svg>
                          Google
                        </a>
                        <button
                          onClick={() => downloadIcs(
                            [calendarEvent],
                            `nate-blake-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
                          )}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-olive-700 px-3 py-1.5 text-xs text-olive-200 transition-colors hover:border-gold-500/60 hover:text-gold-300"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Apple / Outlook
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
