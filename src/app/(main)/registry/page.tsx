'use client';

import { motion } from 'framer-motion';

export default function RegistryPage() {
  return (
    <div className="section-padding bg-cream min-h-[80vh] flex items-center">
      <div className="container-wedding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">Registry</p>
          <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
            Coming Soon
          </h1>
          <div className="gold-line mx-auto mb-8" />

          <div className="bg-white rounded-lg shadow-elegant p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-olive-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-olive-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>

            <p className="text-olive-700 text-lg mb-6">
              We&apos;re still putting together our registry. Check back soon for links to where
              we&apos;ll be registered!
            </p>

            <div className="bg-olive-50 rounded-lg p-6">
              <h3 className="font-heading text-xl text-charcoal mb-3">
                The Greatest Gift
              </h3>
              <p className="text-olive-600">
                Your presence at our wedding is the most meaningful gift you could give us.
                We&apos;re so grateful to celebrate with the people we love most.
              </p>
            </div>
          </div>

          {/* Honeymoon Fund Teaser */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <div className="bg-white rounded-lg shadow-elegant p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">✈️</span>
                <h3 className="font-heading text-xl text-charcoal">Honeymoon Fund</h3>
              </div>
              <p className="text-olive-600 text-sm">
                We&apos;ll also be setting up a honeymoon fund for those who prefer to contribute
                to our post-wedding adventure. Details coming soon!
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
