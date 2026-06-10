'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PageEffects, AnimatedHeader } from '@/components/ui';

interface GalleryPhoto {
  id: string;
  category: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  display_url: string;
  thumbnail_url: string;
  full_url: string;
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPhotos(Array.isArray(data.photos) ? data.photos : []);
        }
      })
      .catch((err) => console.error('Gallery fetch failed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(photos.map((photo) => photo.category)));
    return ['All', ...unique.map(formatCategory)];
  }, [photos]);

  const filteredPhotos = useMemo(
    () => activeCategory === 'All'
      ? photos
      : photos.filter((photo) => photo.category.toLowerCase() === activeCategory.toLowerCase()),
    [photos, activeCategory]
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const stepLightbox = useCallback((delta: number) => {
    setLightboxIndex((current) => {
      if (current === null || filteredPhotos.length === 0) return current;
      return (current + delta + filteredPhotos.length) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, stepLightbox]);

  const lightboxPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  return (
    <div className="section-padding bg-charcoal relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <div className="container-wedding relative z-10">
        {/* Header */}
        <AnimatedHeader
          subtitle="Gallery"
          title="Our Photos"
          description="A collection of our favorite moments together."
        />

        {/* Category Filter */}
        {photos.length > 0 && categories.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setLightboxIndex(null);
                }}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? 'bg-gold-500 text-black'
                    : 'bg-black/50 border border-olive-700 text-olive-300 hover:bg-olive-800'
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>
        )}

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-black/40 border border-olive-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPhotos.map((photo, index) => (
                <motion.button
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-[4/5] bg-black/50 border border-olive-700 rounded-lg shadow-elegant overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold-500/60"
                  aria-label={photo.caption || `${formatCategory(photo.category)} photo`}
                >
                  <Image
                    src={photo.display_url}
                    alt={photo.caption || `${formatCategory(photo.category)} photo of Nate and Blake`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <div className="text-white text-center px-4">
                      {photo.caption && <p className="text-sm mb-1">{photo.caption}</p>}
                      <span className="text-xs uppercase tracking-wider text-gold-300">
                        {formatCategory(photo.category)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 max-w-2xl mx-auto">
              <span className="text-5xl mb-4 block">📷</span>
              <h3 className="font-heading text-2xl text-cream mb-3">
                Photos Coming Soon
              </h3>
              <p className="text-olive-300">
                We&apos;re working on adding our engagement photos and other special moments.
                Check back for updates!
              </p>
            </div>
          </motion.div>
        )}

        {/* Hashtag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-olive-300 mb-2">Share your photos with us using</p>
          <p className="font-heading text-2xl text-gold-500">#NateAndBlakeSayIDo</p>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-cream hover:bg-olive-800 transition-colors"
              aria-label="Close photo viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                  className="absolute left-2 sm:left-6 z-10 p-2 rounded-full bg-black/60 text-cream hover:bg-olive-800 transition-colors"
                  aria-label="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                  className="absolute right-2 sm:right-6 z-10 p-2 rounded-full bg-black/60 text-cream hover:bg-olive-800 transition-colors"
                  aria-label="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <motion.div
              key={lightboxPhoto.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative max-h-[85vh] max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ height: 'min(80vh, 75vw)' }}>
                <Image
                  src={lightboxPhoto.full_url}
                  alt={lightboxPhoto.caption || `${formatCategory(lightboxPhoto.category)} photo of Nate and Blake`}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
              {(lightboxPhoto.caption || filteredPhotos.length > 1) && (
                <div className="mt-3 text-center">
                  {lightboxPhoto.caption && (
                    <p className="text-cream text-sm">{lightboxPhoto.caption}</p>
                  )}
                  {filteredPhotos.length > 1 && lightboxIndex !== null && (
                    <p className="text-olive-400 text-xs mt-1">
                      {lightboxIndex + 1} of {filteredPhotos.length}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
