'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

// Floating particle component
function FloatingParticle({ delay, duration, size, left, top }: {
  delay: number;
  duration: number;
  size: number;
  left: string;
  top: string;
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
        x: [0, Math.random() * 50 - 25, Math.random() * 100 - 50],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
        ease: 'easeOut',
      }}
    />
  );
}

// Sparkle star component
function Sparkle({ style, delay }: { style: React.CSSProperties; delay: number }) {
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
        repeatDelay: Math.random() * 3 + 1,
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

interface PageEffectsProps {
  variant?: 'full' | 'subtle' | 'minimal';
  particleCount?: number;
  sparkleCount?: number;
  showRings?: boolean;
  showGradient?: boolean;
}

export function PageEffects({
  variant = 'subtle',
  particleCount: customParticleCount,
  sparkleCount: customSparkleCount,
  showRings = false,
  showGradient = true,
}: PageEffectsProps) {
  // Configure based on variant
  const config = useMemo(() => {
    switch (variant) {
      case 'full':
        return { particles: 15, sparkles: 10 };
      case 'subtle':
        return { particles: 8, sparkles: 6 };
      case 'minimal':
        return { particles: 4, sparkles: 3 };
      default:
        return { particles: 8, sparkles: 6 };
    }
  }, [variant]);

  const particleCount = customParticleCount ?? config.particles;
  const sparkleCount = customSparkleCount ?? config.sparkles;

  // Generate particles
  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      left: `${Math.random() * 100}%`,
      top: `${60 + Math.random() * 40}%`,
    })), [particleCount]
  );

  // Generate sparkles
  const sparkles = useMemo(() =>
    Array.from({ length: sparkleCount }, (_, i) => ({
      id: i,
      delay: Math.random() * 4,
      style: {
        left: `${10 + Math.random() * 80}%`,
        top: `${10 + Math.random() * 80}%`,
      },
    })), [sparkleCount]
  );

  return (
    <>
      {/* Animated gradient background */}
      {showGradient && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                'radial-gradient(ellipse at 20% 20%, rgba(83, 101, 55, 0.1) 0%, transparent 50%)',
                'radial-gradient(ellipse at 80% 80%, rgba(83, 101, 55, 0.1) 0%, transparent 50%)',
                'radial-gradient(ellipse at 50% 50%, rgba(83, 101, 55, 0.08) 0%, transparent 50%)',
                'radial-gradient(ellipse at 20% 20%, rgba(83, 101, 55, 0.1) 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                'radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 40%)',
                'radial-gradient(ellipse at 20% 80%, rgba(212, 175, 55, 0.03) 0%, transparent 40%)',
                'radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 40%)',
              ],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}

      {/* Animated rings */}
      {showRings && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <AnimatedRing size={300} delay={0} duration={4} />
          <AnimatedRing size={400} delay={1} duration={5} />
          <AnimatedRing size={500} delay={2} duration={6} />
        </div>
      )}

      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Sparkle effects */}
      {sparkles.map((s) => (
        <Sparkle key={s.id} style={s.style} delay={s.delay} />
      ))}
    </>
  );
}

// Glow effect component for highlighting sections
interface GlowEffectProps {
  className?: string;
  color?: 'gold' | 'olive';
  intensity?: 'low' | 'medium' | 'high';
}

export function GlowEffect({ className = '', color = 'gold', intensity = 'medium' }: GlowEffectProps) {
  const colorValue = color === 'gold' ? '212, 175, 55' : '83, 101, 55';
  const opacityMap = { low: 0.08, medium: 0.12, high: 0.18 };
  const opacity = opacityMap[intensity];

  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        background: `radial-gradient(ellipse, rgba(${colorValue}, ${opacity}) 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Animated section header with enhanced effects
interface AnimatedHeaderProps {
  subtitle: string;
  title: string;
  description?: string;
  showGlow?: boolean;
}

export function AnimatedHeader({ subtitle, title, description, showGlow = true }: AnimatedHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16 relative"
    >
      {showGlow && (
        <GlowEffect
          className="w-96 h-32 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          color="gold"
          intensity="low"
        />
      )}

      <motion.p
        className="font-accent text-3xl text-gold-500 mb-4 relative"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {subtitle}
      </motion.p>

      <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6 relative">
        {title}
      </h1>

      {/* Animated gold line */}
      <div className="relative mb-8 flex justify-center">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.5, delay: 0.8 }}
        />
      </div>

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-olive-300 max-w-2xl mx-auto text-lg relative"
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
