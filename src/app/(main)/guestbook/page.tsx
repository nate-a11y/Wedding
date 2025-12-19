'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageEffects, AnimatedHeader } from '@/components/ui';

interface GuestBookEntry {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function GuestBookPage() {
  const [entries, setEntries] = useState<GuestBookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  // Fetch existing entries
  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await fetch('/api/guestbook');
        const data = await response.json();
        if (data.entries) {
          setEntries(data.entries);
        }
      } catch (err) {
        console.error('Failed to fetch guest book entries:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Add the new entry to the list
      if (data.entry) {
        setEntries((prev) => [data.entry, ...prev]);
      }

      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="section-padding bg-charcoal relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <div className="container-wedding relative z-10">
        {/* Header */}
        <AnimatedHeader
          subtitle="Sign Our"
          title="Guest Book"
          description="Leave us a message, share your wishes, or just say hello! We'd love to hear from you."
        />

        <div className="max-w-4xl mx-auto">
          {/* Sign Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 md:p-8 mb-12"
          >
            <h2 className="font-heading text-2xl text-cream mb-6">
              Leave a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                required
                maxLength={100}
              />

              <Input
                label="Your Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                maxLength={255}
              />

              <div className="w-full">
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-cream"
                >
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Share your wishes, memories, or just say hello..."
                  required
                  maxLength={500}
                  rows={4}
                  className="flex w-full rounded-md border border-olive-600 bg-charcoal text-cream px-4 py-3 text-base transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
                <p className="mt-1.5 text-sm text-olive-400">
                  {formData.message.length}/500 characters
                </p>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-500/10 border border-red-500/50 rounded-md"
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-olive-500/10 border border-olive-500/50 rounded-md"
                  >
                    <p className="text-olive-300 text-sm">
                      Thank you for signing our guest book!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" isLoading={isSubmitting} className="w-full md:w-auto">
                Sign Guest Book
              </Button>
            </form>
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="font-heading text-2xl text-cream mb-6 text-center">
              Messages from Our Guests
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                <p className="text-olive-400 mt-4">Loading messages...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 bg-black/30 border border-olive-700 rounded-lg">
                <svg
                  className="w-16 h-16 mx-auto text-olive-600 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p className="text-olive-400 text-lg">
                  Be the first to sign our guest book!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-heading text-lg text-cream">
                        {entry.name}
                      </h3>
                      <span className="text-sm text-olive-500">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-olive-300 whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
