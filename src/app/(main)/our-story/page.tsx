'use client';

import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';

const timeline = [
  {
    date: 'October 31, 2023',
    title: 'We Met',
    description: 'On a Halloween night that would change our lives forever, our paths crossed for the first time. Little did we know that this spooky evening would be the beginning of our greatest adventure.',
    icon: '💀',
  },
  {
    date: '2024',
    title: 'Falling in Love',
    description: 'Through countless dates, late-night conversations, and shared experiences, we discovered that we had found something truly special in each other.',
    icon: '❤️',
  },
  {
    date: 'October 31, 2025',
    title: 'The Proposal',
    description: 'Exactly two years after we met, staying true to our Halloween tradition, the question was popped. The answer was an enthusiastic yes!',
    icon: '💍',
  },
  {
    date: 'October 31, 2027',
    title: 'We Say "I Do"',
    description: "Four years to the day since we first met, we'll exchange vows and begin our next chapter as a married couple.",
    icon: '🎃',
  },
];

export default function OurStoryPage() {
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
          <p className="font-accent text-3xl text-gold-500 mb-4">Our Story</p>
          <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
            How It All Began
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-700 max-w-2xl mx-auto text-lg">
            Every love story is beautiful, but ours is our favorite. Here&apos;s the tale of
            how {siteConfig.couple.person1.firstName} and {siteConfig.couple.person2.firstName} found each other.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-400 via-olive-300 to-gold-400" />

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
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-elegant flex items-center justify-center text-2xl z-10 border-4 border-cream">
                  {event.icon}
                </div>

                {/* Content Card */}
                <div className={`ml-24 md:ml-0 md:w-[calc(50%-3rem)] ${
                  index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'
                }`}>
                  <div className="bg-white rounded-lg shadow-elegant p-6">
                    <span className="text-gold-500 font-medium text-sm uppercase tracking-wider">
                      {event.date}
                    </span>
                    <h3 className="font-heading text-2xl text-charcoal mt-2 mb-3">
                      {event.title}
                    </h3>
                    <p className="text-olive-700">
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

        {/* Photo Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 text-center"
        >
          <div className="bg-white rounded-lg shadow-elegant p-12 max-w-2xl mx-auto">
            <div className="w-full h-64 bg-olive-100 rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <span className="text-6xl mb-4 block">📷</span>
                <p className="text-olive-500">Our photos coming soon</p>
              </div>
            </div>
            <p className="font-accent text-2xl text-gold-500">
              {siteConfig.couple.person1.firstName} & {siteConfig.couple.person2.firstName}
            </p>
            <p className="text-olive-600 mt-2">Forever begins October 31, 2027</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
