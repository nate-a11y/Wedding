'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

const venueImages = [
  { src: '/Callaway+Jewel+4.12.25+Major+FIlms+(8).jpg', alt: 'The Callaway Jewel - Front Entrance' },
  { src: '/Callaway+Jewel+4.12.25+Major+FIlms+(4).webp', alt: 'The Callaway Jewel - Aerial View' },
  { src: '/2a699294-676c-4b3d-be02-3a42a2c228ac.jpg', alt: 'Ceremony Space' },
  { src: '/06ed19cc-b532-41ac-979a-fdf88170954e.jpg', alt: 'Reception Hall' },
  { src: '/499a73fb-3454-4387-ae25-a2b24629ee63.jpg', alt: 'Venue Interior Panorama' },
  { src: '/efec04b6-1560-4b55-a1f4-fb0e92f20b14.jpg', alt: 'Reception Space with Tables' },
];

const hotels = [
  {
    name: 'Baymont by Wyndham Fulton',
    distance: '5 min away',
    address: '2205 Cardinal Dr, Fulton, MO 65251',
    amenities: ['Free WiFi', 'Parking', 'Pool'],
    bookingLink: 'https://www.wyndhamhotels.com/baymont/fulton-missouri/baymont-inn-and-suites-fulton/overview',
  },
  {
    name: 'Holiday Inn Express Kingdom City',
    distance: '10 min away',
    address: '3257 County Rd 211, Kingdom City, MO 65262',
    amenities: ['Free WiFi', 'Parking', 'Breakfast'],
    bookingLink: 'https://www.ihg.com/holidayinnexpress/hotels/us/en/kingdom-city/kcymo/hoteldetail',
  },
  {
    name: 'Baymont by Wyndham Kingdom City',
    distance: '10 min away',
    address: '5750 Jade Rd, Kingdom City, MO 65262',
    amenities: ['Free WiFi', 'Parking', 'Pool'],
    bookingLink: 'https://www.wyndhamhotels.com/baymont/kingdom-city-missouri/baymont-inn-and-suites-kingdom-city/overview',
  },
  {
    name: 'Courtyard by Marriott Jefferson City',
    distance: '30 min away',
    address: '610 Bolivar St, Jefferson City, MO 65101',
    amenities: ['Free WiFi', 'Parking', 'Restaurant'],
    bookingLink: 'https://www.marriott.com/hotels/travel/jefcy-courtyard-jefferson-city/',
  },
];

export default function TravelPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
          <p className="font-accent text-3xl text-gold-500 mb-4">Travel & Stay</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Getting There
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            Everything you need to know about getting to The Callaway Jewel in Fulton, Missouri.
          </p>
        </motion.div>

        {/* Location Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 mb-12 max-w-4xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Map */}
            <div className="rounded-lg overflow-hidden h-64 md:h-auto">
              <iframe
                src="https://maps.google.com/maps?q=4910+County+Rd+105,+Fulton,+MO+65251&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '250px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="The Callaway Jewel Location"
              />
            </div>

            {/* Venue Info */}
            <div>
              <h2 className="font-heading text-2xl text-cream mb-4">The Callaway Jewel</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-cream">4910 County Rd 105</p>
                    <p className="text-olive-300">Fulton, MO 65251</p>
                  </div>
                </div>
                <p className="text-olive-300 text-sm">
                  A stunning modern farmhouse venue featuring elegant indoor spaces with vaulted wood ceilings,
                  crystal chandeliers, and beautiful outdoor areas perfect for our Halloween celebration.
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href="https://www.thecallawayjewel.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold-500 hover:text-gold-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Venue Website
                  </a>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=4910+County+Rd+105+Fulton+MO+65251"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-olive-300 hover:text-olive-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Venue Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-5xl mx-auto"
        >
          <h2 className="font-heading text-2xl text-cream text-center mb-6">
            Venue Photos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {venueImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setLightboxIndex(index)}
                className="relative aspect-[4/3] rounded-lg overflow-hidden group cursor-pointer"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gold-400 transition-colors"
              onClick={() => setLightboxIndex(null)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gold-400 transition-colors p-2"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === 0 ? venueImages.length - 1 : (prev ?? 0) - 1));
              }}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gold-400 transition-colors p-2"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === venueImages.length - 1 ? 0 : (prev ?? 0) + 1));
              }}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="relative max-w-5xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
              <Image
                src={venueImages[lightboxIndex].src}
                alt={venueImages[lightboxIndex].alt}
                width={1200}
                height={800}
                className="object-contain w-full h-full max-h-[80vh]"
              />
              <p className="text-center text-olive-300 mt-4">{venueImages[lightboxIndex].alt}</p>
            </div>
          </div>
        )}

        {/* Accommodations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="font-heading text-3xl text-cream text-center mb-8">
            Accommodations
          </h2>
          <p className="text-olive-300 text-center mb-8 max-w-2xl mx-auto">
            Here are some nearby hotel options for your stay. We recommend booking early!
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {hotels.map((hotel, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6"
              >
                <div className="w-full h-24 bg-olive-800 rounded-lg mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-olive-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg text-cream mb-2">{hotel.name}</h3>
                <p className="text-gold-500 text-sm font-medium mb-1">{hotel.distance}</p>
                <p className="text-olive-400 text-xs mb-3">{hotel.address}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="text-xs bg-olive-800 text-olive-300 px-2 py-1 rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(hotel.bookingLink, '_blank')}
                >
                  Book Now
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
          <h2 className="font-heading text-3xl text-cream text-center mb-8">
            Getting Around
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-olive-800 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-olive-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-cream">By Air</h3>
              </div>
              <p className="text-olive-300">
                The closest major airports are Columbia Regional Airport (COU) about 30 minutes away,
                and St. Louis Lambert International Airport (STL) about 1.5 hours away.
              </p>
            </div>

            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-olive-800 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-olive-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-cream">Parking</h3>
              </div>
              <p className="text-olive-300">
                Plenty of free parking available on-site at The Callaway Jewel.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
