'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { PageEffects } from '@/components/ui/PageEffects';

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  // Determine if this is admin login based on redirect
  const isAdminLogin = redirect.startsWith('/admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          type: isAdminLogin ? 'admin' : 'guest',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // For admin, redirect to admin subdomain if possible
        if (isAdminLogin && typeof window !== 'undefined') {
          window.location.href = 'https://admin.nateandblake.me';
        } else {
          router.push(redirect);
          router.refresh();
        }
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4 relative overflow-hidden">
      <PageEffects variant="subtle" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-accent text-4xl text-gold-500 mb-2"
          >
            Nate & Blake
          </motion.p>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-3xl text-cream"
          >
            Welcome
          </motion.h1>
          {/* Animated gold line with pulsing dot */}
          <div className="relative mt-4 flex justify-center">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.5, delay: 0.9 }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8"
        >
          <p className="text-center text-olive-300 mb-6">
            {isAdminLogin
              ? 'Enter the admin password to access the wedding planner.'
              : 'Please enter the password to view our wedding website.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-cream mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-11 w-full rounded-md border border-olive-600 bg-charcoal px-4 py-2 text-base text-cream transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                placeholder="Enter password"
                required
                autoFocus
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              Enter Site
            </Button>
          </form>

          <p className="text-center text-sm text-olive-400 mt-6">
            Hint: Ask Nate or Blake for the password
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-olive-300 mt-8 font-heading text-lg"
        >
          October 31, 2027
        </motion.p>
      </motion.div>
    </div>
  );
}
