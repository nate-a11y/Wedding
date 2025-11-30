'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Placeholder images - will be replaced with real photos
const placeholderImages = [
  { id: '1', category: 'couple' },
  { id: '2', category: 'couple' },
  { id: '3', category: 'engagement' },
  { id: '4', category: 'engagement' },
  { id: '5', category: 'couple' },
  { id: '6', category: 'engagement' },
];

const categories = ['All', 'Couple', 'Engagement'];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredImages = activeCategory === 'All'
    ? placeholderImages
    : placeholderImages.filter(img => img.category.toLowerCase() === activeCategory.toLowerCase());

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
          <p className="font-accent text-3xl text-gold-500 mb-4">Gallery</p>
          <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
            Our Photos
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-700 max-w-2xl mx-auto text-lg">
            A collection of our favorite moments together. More photos coming soon!
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-4 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? 'bg-olive-500 text-white'
                  : 'bg-white text-olive-600 hover:bg-olive-100'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative aspect-[4/5] bg-white rounded-lg shadow-elegant overflow-hidden cursor-pointer"
              >
                {/* Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-olive-100 to-olive-200 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-olive-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-olive-500 text-sm">Photo coming soon</p>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-white text-center">
                    <span className="text-sm uppercase tracking-wider">{image.category}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Coming Soon Message */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-lg shadow-elegant p-8 max-w-2xl mx-auto">
            <span className="text-5xl mb-4 block">📷</span>
            <h3 className="font-heading text-2xl text-charcoal mb-3">
              More Photos Coming Soon
            </h3>
            <p className="text-olive-600">
              We&apos;re working on adding our engagement photos and other special moments.
              Check back for updates!
            </p>
          </div>
        </motion.div>

        {/* Hashtag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-olive-600 mb-2">Share your photos with us using</p>
          <p className="font-heading text-2xl text-gold-500">#NateAndBlakeSayIDo</p>
        </motion.div>
      </div>
    </div>
  );
}
