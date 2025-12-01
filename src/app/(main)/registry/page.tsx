'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface RegistryItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  color: string;
  comingSoon?: boolean;
}

const registries: RegistryItem[] = [
  {
    name: 'Amazon',
    description: 'Our curated wishlist of items for our new home together.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.493.124.102.17.05.324-.156.462l-.09.063c-2.96 2.057-6.34 3.086-10.145 3.086-4.128 0-7.82-1.077-11.08-3.234a.363.363 0 01-.1-.485zm-.028-2.247c.064-.21.21-.24.436-.09.016.012.047.033.094.062 3.27 2.01 6.867 3.014 10.79 3.014 2.34 0 4.628-.343 6.863-1.027.378-.116.675.07.892.556.217.49.09.818-.382 1.027-2.406.9-4.893 1.35-7.46 1.35-4.08 0-7.707-1.046-10.884-3.136l-.062-.044c-.265-.174-.345-.402-.287-.712zm14.227-10.84c.652-.67 1.422-.88 2.312-.63.89.25 1.504.81 1.843 1.68l.014.038c.34.894.24 1.753-.298 2.58l-.016.023-.6.89c-.132.193-.12.388.035.58.156.192.357.243.604.153l.035-.014c.645-.232 1.23-.092 1.753.42.524.512.695 1.116.51 1.813-.184.696-.6 1.19-1.247 1.48l-.028.013c-.28.13-.59.235-.93.31l-.1.024c-.9.182-1.76.052-2.583-.392l-.05-.028a3.548 3.548 0 01-1.418-1.378l-.033-.06c-.3-.56-.377-1.147-.227-1.764l.02-.073c.152-.56.45-1.022.89-1.39l.034-.026c.132-.107.19-.232.177-.375-.013-.143-.095-.253-.247-.33l-.03-.014c-.24-.1-.52-.094-.84.02l-.048.017c-.42.152-.806.12-1.156-.095-.35-.215-.554-.523-.615-.922l-.006-.04c-.06-.43.04-.82.3-1.167l.02-.026c.286-.376.62-.682.998-.916l.033-.02c.374-.228.77-.372 1.19-.43l.048-.007c.47-.06.906.01 1.308.213z"/>
      </svg>
    ),
    url: 'https://www.amazon.com/wedding/share/NateAndBlakeSayIDo2027',
    color: 'bg-[#FF9900]',
  },
  {
    name: 'Crate & Barrel',
    description: 'Classic home essentials and modern kitchen must-haves.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    url: '#',
    color: 'bg-[#000000]',
    comingSoon: true,
  },
  {
    name: 'Williams Sonoma',
    description: 'Premium cookware and gourmet kitchen items.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    url: '#',
    color: 'bg-[#1a3a5c]',
    comingSoon: true,
  },
  {
    name: 'Target',
    description: 'Everyday essentials and practical home items.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
    url: '#',
    color: 'bg-[#CC0000]',
    comingSoon: true,
  },
];

export default function RegistryPage() {
  return (
    <div className="section-padding bg-charcoal">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">Registry</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Gift Registry
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 text-lg">
            Your presence at our wedding is the greatest gift of all. However, if you wish to
            honor us with a gift, we&apos;ve registered at the following stores.
          </p>
        </motion.div>

        {/* Registry Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {registries.map((registry, index) => (
            <motion.div
              key={registry.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {registry.comingSoon ? (
                <div className="relative bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 opacity-75">
                  <div className="absolute top-3 right-3 bg-olive-700 text-olive-200 text-xs px-2 py-1 rounded">
                    Coming Soon
                  </div>
                  <div className={`w-14 h-14 ${registry.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                    {registry.icon}
                  </div>
                  <h3 className="font-heading text-xl text-cream mb-2">{registry.name}</h3>
                  <p className="text-olive-400 text-sm">{registry.description}</p>
                </div>
              ) : (
                <Link
                  href={registry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 hover:border-gold-500 hover:bg-olive-900/30 transition-all group"
                >
                  <div className={`w-14 h-14 ${registry.color} rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    {registry.icon}
                  </div>
                  <h3 className="font-heading text-xl text-cream mb-2 group-hover:text-gold-500 transition-colors">
                    {registry.name}
                  </h3>
                  <p className="text-olive-400 text-sm">{registry.description}</p>
                  <div className="mt-4 text-gold-500 text-sm font-medium flex items-center gap-1">
                    View Registry
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Honeymoon Fund */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-br from-olive-900/50 to-black/50 border border-gold-500/30 rounded-lg shadow-elegant p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gold-500/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">✈️</span>
            </div>
            <h2 className="font-heading text-2xl text-cream mb-4">Honeymoon Fund</h2>
            <p className="text-olive-300 mb-6">
              In lieu of traditional gifts, we&apos;d love contributions toward our dream honeymoon
              adventure. Every contribution helps us create unforgettable memories together!
            </p>
            <div className="bg-olive-900/50 rounded-lg p-4 mb-6">
              <p className="text-olive-400 text-sm italic">
                Honeymoon fund link coming soon! We&apos;re still planning our destination.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="bg-olive-800/50 text-olive-300 px-3 py-1 rounded-full text-sm">🏖️ Beach</span>
              <span className="bg-olive-800/50 text-olive-300 px-3 py-1 rounded-full text-sm">🏔️ Mountains</span>
              <span className="bg-olive-800/50 text-olive-300 px-3 py-1 rounded-full text-sm">🌍 Adventure</span>
              <span className="bg-olive-800/50 text-olive-300 px-3 py-1 rounded-full text-sm">🍷 Wine Country</span>
            </div>
          </div>
        </motion.div>

        {/* Thank You Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <div className="bg-black/30 border border-olive-700 rounded-lg p-6 max-w-xl mx-auto">
            <p className="font-accent text-2xl text-gold-500 mb-2">Thank You</p>
            <p className="text-olive-300">
              We are so grateful for your love and support. Your presence on our special day
              means more to us than any gift ever could.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
