'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

const hotels = [
  {
    name: 'Hotel TBA',
    distance: 'Distance TBA',
    rate: 'Rate TBA',
    amenities: ['Free WiFi', 'Parking', 'Pool'],
    bookingLink: '#',
  },
  {
    name: 'Hotel TBA',
    distance: 'Distance TBA',
    rate: 'Rate TBA',
    amenities: ['Free WiFi', 'Parking', 'Breakfast'],
    bookingLink: '#',
  },
  {
    name: 'Hotel TBA',
    distance: 'Distance TBA',
    rate: 'Rate TBA',
    amenities: ['Free WiFi', 'Parking', 'Gym'],
    bookingLink: '#',
  },
];

export default function TravelPage() {
  return (
    <div className="section-padding bg-cream">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">Travel & Stay</p>
          <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
            Getting There
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-700 max-w-2xl mx-auto text-lg">
            Information about accommodations and travel will be updated once the venue is finalized.
          </p>
        </motion.div>

        {/* Location Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-elegant p-8 mb-12 max-w-4xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Map Placeholder */}
            <div className="bg-olive-100 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-olive-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-olive-500">Map coming soon</p>
              </div>
            </div>

            {/* Venue Info */}
            <div>
              <h2 className="font-heading text-2xl text-charcoal mb-4">Venue Location</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-charcoal">Address TBA</p>
                    <p className="text-olive-600">Location to be announced</p>
                  </div>
                </div>
                <p className="text-olive-700">
                  We&apos;re still finalizing our venue. Check back for updates on the location,
                  directions, and parking information.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Accommodations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-heading text-3xl text-charcoal text-center mb-8">
            Accommodations
          </h2>
          <p className="text-olive-600 text-center mb-8 max-w-2xl mx-auto">
            We&apos;ll negotiate room blocks at nearby hotels once the venue is confirmed.
            Check back for special rates and booking information.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {hotels.map((hotel, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-elegant p-6"
              >
                <div className="w-full h-32 bg-olive-100 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-olive-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-charcoal mb-2">{hotel.name}</h3>
                <p className="text-olive-600 text-sm mb-1">{hotel.distance}</p>
                <p className="text-gold-600 font-medium mb-3">{hotel.rate}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="text-xs bg-olive-100 text-olive-600 px-2 py-1 rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Transportation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-heading text-3xl text-charcoal text-center mb-8">
            Getting Around
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-elegant p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-charcoal">By Air</h3>
              </div>
              <p className="text-olive-700">
                Nearest airport information will be provided once the venue is confirmed.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-elegant p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-charcoal">Parking</h3>
              </div>
              <p className="text-olive-700">
                Parking details and shuttle information will be shared closer to the date.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
