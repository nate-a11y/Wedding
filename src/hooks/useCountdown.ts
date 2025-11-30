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

  const [timeRemaining, setTimeRemaining] = useState<CountdownResult>(() => {
    const { days, hours, minutes, seconds, total } = calculateTimeRemaining();
    return {
      days,
      hours,
      minutes,
      seconds,
      isComplete: total <= 0,
    };
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
