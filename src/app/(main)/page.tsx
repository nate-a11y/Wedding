import Image from 'next/image';
import { Hero } from '@/components/sections';

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Welcome Section */}
      <section className="section-padding bg-black">
        <div className="container-wedding text-center max-w-3xl mx-auto">
          <p className="font-accent text-3xl text-gold-500 mb-4">Welcome</p>
          <h2 className="font-heading text-3xl md:text-4xl text-cream mb-6">
            We Can&apos;t Wait to Celebrate With You
          </h2>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 text-lg leading-relaxed">
            We are so excited to share our special day with the people we love most.
            This website is your one-stop destination for all the details about our wedding.
            We&apos;ll be updating it with more information as the big day approaches.
          </p>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="section-padding bg-charcoal">
        <div className="container-wedding">
          <div className="grid md:grid-cols-3 gap-8">
            {/* When */}
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-cream mb-2">When</h3>
              <p className="text-gold-400 font-medium">October 31, 2027</p>
              <p className="text-olive-400 text-sm">Time TBA</p>
            </div>

            {/* Where */}
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-cream mb-2">Where</h3>
              <p className="text-gold-400 font-medium">Location TBA</p>
              <p className="text-olive-400 text-sm">Stay tuned!</p>
            </div>

            {/* RSVP */}
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl text-cream mb-2">RSVP</h3>
              <p className="text-gold-400 font-medium">Coming Soon</p>
              <p className="text-olive-400 text-sm">Check back later</p>
            </div>
          </div>
        </div>
      </section>

      {/* Flower Girl Section */}
      <section className="section-padding bg-black">
        <div className="container-wedding text-center max-w-2xl mx-auto">
          <p className="font-accent text-2xl text-gold-500 mb-4">Special Guest</p>
          <h2 className="font-heading text-2xl md:text-3xl text-cream mb-6">
            Meet Our Flower Girl
          </h2>
          <div className="gold-line mx-auto mb-8" />
          <div className="bg-olive-900/50 border border-olive-700 rounded-lg p-8">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gold-500">
              <Image
                src="/20250119_000105.jpg"
                alt="Honey - Our Flower Girl"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-heading text-2xl text-cream mb-2">Honey</h3>
            <p className="text-gold-400 uppercase tracking-wider text-sm mb-4">Flower Girl</p>
            <p className="text-olive-300">
              The goodest girl and most important member of the wedding party.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
