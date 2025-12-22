'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { Countdown } from './Countdown';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui';
import Link from 'next/link';

// Floating particle component
function FloatingParticle({ delay, duration, size, left, top, xOffset1, xOffset2, repeatDelay }: {
  delay: number;
  duration: number;
  size: number;
  left: string;
  top: string;
  xOffset1: number;
  xOffset2: number;
  repeatDelay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left,
        top,
        background: `radial-gradient(circle, rgba(212, 175, 55, 0.8) 0%, rgba(212, 175, 55, 0) 70%)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        y: [0, -100, -200, -300],
        x: [0, xOffset1, xOffset2],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: 'easeOut',
      }}
    />
  );
}

// Animated ring component
function AnimatedRing({ size, delay, duration }: { size: number; delay: number; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-gold-500/20 pointer-events-none"
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, 0.5, 0],
        scale: [0.8, 1.2, 1.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

// Sparkle star component
function Sparkle({ style, delay, repeatDelay }: { style: React.CSSProperties; delay: number; repeatDelay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={style}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        repeatDelay,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 0L11.5 8.5L20 10L11.5 11.5L10 20L8.5 11.5L0 10L8.5 8.5L10 0Z"
          fill="rgba(212, 175, 55, 0.6)"
        />
      </svg>
    </motion.div>
  );
}

// Letter animation component - renders text with optional animation
function AnimatedText({ text, className }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text}
    </span>
  );
}

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Seeded random function for deterministic values
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Generate particles with deterministic values
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: seededRandom(i * 1) * 5,
      duration: 4 + seededRandom(i * 2) * 3,
      size: 4 + seededRandom(i * 3) * 8,
      left: `${seededRandom(i * 4) * 100}%`,
      top: `${60 + seededRandom(i * 5) * 40}%`,
      xOffset1: seededRandom(i * 9) * 50 - 25,
      xOffset2: seededRandom(i * 10) * 100 - 50,
      repeatDelay: seededRandom(i * 11) * 2,
    })), []
  );

  // Generate sparkles with deterministic values
  const sparkles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: seededRandom(i * 6) * 4,
      style: {
        left: `${10 + seededRandom(i * 7) * 80}%`,
        top: `${10 + seededRandom(i * 8) * 80}%`,
      },
      repeatDelay: seededRandom(i * 12) * 3 + 1,
    })), []
  );

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-x-hidden bg-charcoal">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse at 20% 20%, rgba(83, 101, 55, 0.15) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 80%, rgba(83, 101, 55, 0.15) 0%, transparent 50%)',
            'radial-gradient(ellipse at 50% 50%, rgba(83, 101, 55, 0.1) 0%, transparent 50%)',
            'radial-gradient(ellipse at 20% 20%, rgba(83, 101, 55, 0.15) 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Secondary gradient overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.05) 0%, transparent 40%)',
            'radial-gradient(ellipse at 20% 80%, rgba(212, 175, 55, 0.05) 0%, transparent 40%)',
            'radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.05) 0%, transparent 40%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

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

      {/* Floating particles */}
      {mounted && particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Sparkle effects */}
      {mounted && sparkles.map((s) => (
        <Sparkle key={s.id} style={s.style} delay={s.delay} repeatDelay={s.repeatDelay} />
      ))}

      {/* Content */}
      <div className="container-wedding relative z-10 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center relative">
          {/* Animated rings behind content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatedRing size={300} delay={0} duration={4} />
            <AnimatedRing size={400} delay={1} duration={5} />
            <AnimatedRing size={500} delay={2} duration={6} />
          </div>

          {/* Glow effect behind names */}
          <motion.div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Decorative Top Element */}
          <div className="mb-6 md:mb-8 relative">
            <motion.span
              className="text-olive-400 text-xl sm:text-2xl md:text-3xl uppercase tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] font-medium inline-block"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              We&apos;re Getting Married
            </motion.span>
          </div>

          {/* Names with letter animation */}
          <div className="mb-4 md:mb-6 relative">
            <h1 className="font-accent text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] mb-4 md:mb-6">
              <AnimatedText
                text={siteConfig.couple.person1.firstName}
                className="text-gold-500"
                delay={0.3}
              />
              <span className="text-olive-500 mx-2 md:mx-3 inline-block">
                &amp;
              </span>
              <AnimatedText
                text={siteConfig.couple.person2.firstName}
                className="text-gold-500"
                delay={0.7}
              />
            </h1>
          </div>

          {/* Animated Gold Line */}
          <div className="relative mb-8 md:mb-10 flex justify-center">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 1.2, ease: 'easeOut' }}
              className="h-[2px] w-56 md:w-72 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.5, delay: 1.5 }}
            />
          </div>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="mb-8 md:mb-10"
          >
            <motion.p
              className="font-heading text-3xl md:text-4xl text-cream tracking-wide"
              animate={{ textShadow: ['0 0 20px rgba(212, 175, 55, 0)', '0 0 20px rgba(212, 175, 55, 0.3)', '0 0 20px rgba(212, 175, 55, 0)'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {siteConfig.wedding.displayDate}
            </motion.p>
            <p className="text-olive-300 mt-2 text-lg md:text-xl">
              The Callaway Jewel • Fulton, Missouri
            </p>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            className="mb-8 md:mb-10"
          >
            <Countdown targetDate={siteConfig.wedding.date} />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.7 }}
            className="flex flex-row items-center justify-center gap-4"
          >
            <Link href="/our-story">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="primary" size="lg">
                  Our Story
                </Button>
              </motion.div>
            </Link>
            <Link href="/rsvp">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg">
                  RSVP
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-gold-500"
          >
            <motion.svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </motion.svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-charcoal to-transparent pointer-events-none" />
    </section>
  );
}
