'use client';

import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks';

interface CountdownProps {
  targetDate: Date;
}

export function Countdown({ targetDate }: CountdownProps) {
  const { days, hours, minutes, seconds, isComplete } = useCountdown(targetDate);

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <p className="font-heading text-3xl text-gold-500">
          Today is the day!
        </p>
      </motion.div>
    );
  }

  const timeUnits = [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Minutes' },
    { value: seconds, label: 'Seconds' },
  ];

  return (
    <div className="flex justify-center gap-4 md:gap-8">
      {timeUnits.map((unit, index) => (
        <motion.div
          key={unit.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="bg-white shadow-elegant rounded-lg p-4 md:p-6 min-w-[70px] md:min-w-[90px]">
              <span className="font-heading text-3xl md:text-5xl text-charcoal block">
                {String(unit.value).padStart(2, '0')}
              </span>
            </div>
            {/* Gold accent line at bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-gold-400 to-gold-600" />
          </div>
          <span className="text-xs md:text-sm uppercase tracking-wider text-olive-600 mt-3 block font-medium">
            {unit.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
