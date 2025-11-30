'use client';

import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';

const timeline = [
  {
    date: 'October 31, 2023',
    title: 'A Halloween Night',
    description: 'We met on Halloween night at The Wet Spot. It was by chance, it was random—but there was a connection unlike anything either of us had ever seen. Something deep.',
    icon: '💀',
  },
  {
    date: '2024',
    title: 'Late Night Talks & A Spark',
    description: 'Over time, we bonded over late night talks. We had a spark that just kept growing. Through good times and bad times, we stayed by each other\'s side—partners, rocks, best friends.',
    icon: '❤️',
  },
  {
    date: 'October 31, 2025',
    title: 'The Proposal',
    description: 'Exactly two years after we met, staying true to our Halloween tradition, the question was popped. The answer was an enthusiastic yes! What we have is so precious.',
    icon: '💍',
  },
  {
    date: 'October 31, 2027',
    title: 'We Say "I Do"',
    description: "Four years to the day since we first met, we'll exchange vows and begin our next chapter. Nobody's got it quite like us.",
    icon: '🎃',
  },
];

export default function OurStoryPage() {
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
          <p className="font-accent text-3xl text-gold-500 mb-4">Our Story</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            How It All Began
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            Every love story is beautiful, but ours is our favorite. Here&apos;s the tale of
            how {siteConfig.couple.person1.firstName} and {siteConfig.couple.person2.firstName} found each other.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-400 via-olive-600 to-gold-400" />

            {timeline.map((event, index) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex items-start gap-8 mb-12 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Timeline Node */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-16 h-16 bg-charcoal rounded-full shadow-elegant flex items-center justify-center text-2xl z-10 border-4 border-olive-700">
                  {event.icon}
                </div>

                {/* Content Card */}
                <div className={`ml-24 md:ml-0 md:w-[calc(50%-3rem)] ${
                  index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'
                }`}>
                  <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6">
                    <span className="text-gold-400 font-medium text-sm uppercase tracking-wider">
                      {event.date}
                    </span>
                    <h3 className="font-heading text-2xl text-cream mt-2 mb-3">
                      {event.title}
                    </h3>
                    <p className="text-olive-300">
                      {event.description}
                    </p>
                  </div>
                </div>

                {/* Spacer for opposite side */}
                <div className="hidden md:block md:w-[calc(50%-3rem)]" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Our Song */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 text-center"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 max-w-2xl mx-auto">
            <p className="font-accent text-2xl text-gold-500 mb-2">Our Song</p>
            <h3 className="font-heading text-xl text-cream mb-4">&ldquo;Precious&rdquo;</h3>
            <p className="text-olive-300 mb-6 text-sm italic">
              Written by Nate for our first anniversary
            </p>
            <iframe
              src="https://open.spotify.com/embed/track/0TSZyKRlyOa6zIaG32i8J3?utm_source=generator&theme=0"
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>
        </motion.div>

        {/* Photo Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-12 max-w-2xl mx-auto">
            <div className="w-full h-64 bg-olive-900/50 rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <span className="text-6xl mb-4 block">📷</span>
                <p className="text-olive-400">Our photos coming soon</p>
              </div>
            </div>
            <p className="font-accent text-2xl text-gold-500">
              {siteConfig.couple.person1.firstName} & {siteConfig.couple.person2.firstName}
            </p>
            <p className="text-olive-300 mt-2">Forever begins October 31, 2027</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
