'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Countdown } from './Countdown';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-charcoal">
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
      <div className="container-wedding relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Save the Date Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md">
              <Image
                src="/Save the Date.png"
                alt="Save the Date - Nate & Blake - October 31, 2027"
                width={600}
                height={800}
                className="rounded-lg shadow-2xl"
                priority
              />
            </div>
          </motion.div>

          {/* Text Content */}
          <div className="text-center lg:text-left">
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
              <h1 className="font-accent text-5xl md:text-6xl lg:text-7xl text-gold-500 mb-4">
                {siteConfig.couple.person1.firstName}
                <span className="text-olive-500 mx-3">&</span>
                {siteConfig.couple.person2.firstName}
              </h1>
            </motion.div>

            {/* Gold Line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="gold-line mb-8 lg:mx-0 mx-auto !w-48 md:!w-64"
            />

            {/* Date */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-10"
            >
              <p className="font-heading text-2xl md:text-3xl text-cream tracking-wide">
                {siteConfig.wedding.displayDate}
              </p>
              <p className="text-olive-300 mt-2">
                The Callaway Jewel • Fulton, Missouri
              </p>
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-10"
            >
              <Countdown targetDate={siteConfig.wedding.date} />
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4"
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
          </div>
        </div>

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
            className="text-gold-500"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
