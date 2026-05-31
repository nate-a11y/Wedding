'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTimeRemaining } from '@/lib/utils';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

/**
 * Custom hook for countdown timer functionality
 * @param targetDate - The target date to count down to
 * @returns Object containing days, hours, minutes, seconds, and completion status
 */
export function useCountdown(targetDate: Date): CountdownResult {
  const calculateTimeRemaining = useCallback(() => {
    return getTimeRemaining(targetDate);
  }, [targetDate]);

  // Keep SSR and the first client render identical. The real countdown is
  // calculated after mount to avoid React hydration text mismatches when the
  // server/client render happen on different seconds.
  const [timeRemaining, setTimeRemaining] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const { days, hours, minutes, seconds, total } = calculateTimeRemaining();
      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isComplete: total <= 0,
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [calculateTimeRemaining]);

  return timeRemaining;
}
