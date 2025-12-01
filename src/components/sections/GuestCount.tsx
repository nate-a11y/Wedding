'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface GuestCountProps {
  className?: string;
}

export function GuestCount({ className = '' }: GuestCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        if (data.rsvps) {
          setCount(data.rsvps.totalGuests);
        }
      } catch (err) {
        console.error('Failed to fetch guest count:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCount();
  }, []);

  if (loading || count === null || count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 bg-gold-500/20 text-gold-400 px-4 py-2 rounded-full ${className}`}
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
      </span>
      <span className="font-medium">
        {count} {count === 1 ? 'guest' : 'guests'} attending
      </span>
    </motion.div>
  );
}
