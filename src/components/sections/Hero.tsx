'use client';

import { motion } from 'framer-motion';
import { Countdown } from './Countdown';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cream">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #808000 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="container-wedding relative z-10 text-center py-20">
        {/* Decorative Top Element */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <span className="text-olive-400 text-sm uppercase tracking-[0.3em] font-medium">
            We&apos;re Getting Married
          </span>
        </motion.div>

        {/* Names */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4"
        >
          <h1 className="font-accent text-6xl md:text-7xl lg:text-8xl text-gold-500 mb-4">
            {siteConfig.couple.person1.firstName}
            <span className="text-olive-500 mx-4">&</span>
            {siteConfig.couple.person2.firstName}
          </h1>
        </motion.div>

        {/* Gold Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="gold-line mx-auto mb-8"
        />

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-12"
        >
          <p className="font-heading text-2xl md:text-3xl text-charcoal tracking-wide">
            {siteConfig.wedding.displayDate}
          </p>
          <p className="text-olive-600 mt-2">
            Location to be announced
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <Countdown targetDate={siteConfig.wedding.date} />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/our-story">
            <Button variant="primary" size="lg">
              Our Story
            </Button>
          </Link>
          <Link href="/rsvp">
            <Button variant="outline" size="lg">
              RSVP
            </Button>
          </Link>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 border-2 border-olive-300 rounded-full flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 bg-olive-400 rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
