'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'heart' | 'sparkle';
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

export interface CelebrationAnimationProps {
  isActive: boolean;
  particleCount?: number;
}

function CelebrationAnimation({ isActive, particleCount = 100 }: CelebrationAnimationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive) {
      const newParticles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          type: Math.random() > 0.4 ? 'sparkle' : 'heart',
          size: Math.random() * 16 + 10,
          delay: Math.random() * 4,
          duration: Math.random() * 4 + 5,
          rotation: Math.random() * 720 - 360,
        });
      }
      setParticles(newParticles);
    }
  }, [isActive, particleCount]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: '-20px',
              }}
              initial={{
                opacity: 0,
                y: 0,
                rotate: 0,
                scale: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: ['0vh', '110vh'],
                rotate: [0, particle.rotation],
                scale: [0, 1, 1, 0.5],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              {particle.type === 'heart' ? (
                <svg
                  width={particle.size}
                  height={particle.size}
                  viewBox="0 0 24 24"
                  fill="#e84a7f"
                  className="drop-shadow-lg"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg
                  width={particle.size}
                  height={particle.size}
                  viewBox="0 0 24 24"
                  className="drop-shadow-lg"
                >
                  <motion.path
                    d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z"
                    fill="#d4a853"
                    animate={{
                      fill: ['#d4a853', '#f5d78e', '#d4a853'],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </svg>
              )}
            </motion.div>
          ))}

          {/* Central burst effects - multiple waves */}
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0, 2.5, 4] }}
              transition={{ duration: 1.5, delay, ease: 'easeOut' }}
            >
              <div className="w-48 h-48 rounded-full bg-gradient-radial from-gold-400/50 via-gold-500/20 to-transparent" />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export { CelebrationAnimation };
