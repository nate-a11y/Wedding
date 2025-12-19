'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, CelebrationAnimation, PageEffects, AnimatedHeader, AnimatedGoldLine } from '@/components/ui';
import type { MealChoice, FormState } from '@/types';

interface AdditionalGuest {
  id: string;
  name: string;
  mealChoice: MealChoice | '';
  isChild: boolean;
}

export default function RSVPPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [showCelebration, setShowCelebration] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: '',
    mealChoice: '' as MealChoice | '',
    dietaryRestrictions: '',
    songRequest: '',
    message: '',
  });
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          additionalGuests: additionalGuests.filter(g => g.name.trim() !== ''),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit RSVP');
      }

      setFormState({
        status: 'success',
        message: result.message || 'Thank you for your RSVP!',
      });
      setShowCelebration(true);
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addGuest = () => {
    setAdditionalGuests([
      ...additionalGuests,
      { id: crypto.randomUUID(), name: '', mealChoice: '', isChild: false },
    ]);
  };

  const removeGuest = (id: string) => {
    setAdditionalGuests(additionalGuests.filter(g => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof AdditionalGuest, value: string | boolean) => {
    setAdditionalGuests(
      additionalGuests.map(g =>
        g.id === id ? { ...g, [field]: value } : g
      )
    );
  };

  // RSVP availability windows
  const now = new Date();

  // Production window: April 1, 2027 - Sept 1, 2027
  const prodStart = new Date('2027-04-01T00:00:00');
  const prodEnd = new Date('2027-09-01T23:59:59');
  const inProdWindow = now >= prodStart && now <= prodEnd;

  const rsvpStatus = inProdWindow ? 'open' : now < prodStart ? 'not-yet' : 'closed';

  // Before April 1, 2027 - not yet accepting RSVPs
  if (rsvpStatus === 'not-yet') {
    return (
      <div className="section-padding bg-charcoal min-h-[80vh] flex items-center relative overflow-hidden">
        <PageEffects variant="minimal" showGradient={true} />
        <div className="container-wedding relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="font-accent text-3xl text-gold-500 mb-4">RSVP</p>
            <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
              Coming Soon
            </h1>
            <AnimatedGoldLine />

            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-olive-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <p className="text-olive-300 text-lg mb-6">
                We&apos;re not quite ready for RSVPs yet! Save the dates will be going out soon,
                and we&apos;ll open RSVPs on April 1, 2027.
              </p>

              <div className="bg-olive-900/50 border border-olive-700 rounded-lg p-4">
                <p className="text-olive-300 text-sm">
                  <strong className="text-gold-400">Save the Date:</strong> October 31, 2027
                </p>
                <p className="text-olive-400 text-sm mt-1">
                  RSVPs open April 1, 2027 through September 1, 2027
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // After September 1, 2027 - RSVP period closed
  if (rsvpStatus === 'closed') {
    return (
      <div className="section-padding bg-charcoal min-h-[80vh] flex items-center relative overflow-hidden">
        <PageEffects variant="minimal" showGradient={true} />
        <div className="container-wedding relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="font-accent text-3xl text-gold-500 mb-4">RSVP</p>
            <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
              RSVP Period Closed
            </h1>
            <AnimatedGoldLine />

            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-olive-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <p className="text-olive-300 text-lg mb-6">
                The RSVP period has ended. If you still need to respond, please reach out to us directly.
              </p>

              <div className="bg-olive-900/50 border border-olive-700 rounded-lg p-4">
                <p className="text-olive-300 text-sm">
                  <strong className="text-gold-400">Contact Us:</strong>
                </p>
                <p className="text-olive-400 text-sm mt-1">
                  Email us at <a href="mailto:wedding@nateandblake.me" className="text-gold-400 hover:text-gold-300">wedding@nateandblake.me</a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-charcoal relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <CelebrationAnimation isActive={showCelebration} />
      <div className="container-wedding relative z-10">
        {/* Header */}
        <AnimatedHeader
          subtitle="RSVP"
          title="Will You Join Us?"
          description="Please respond by September 1, 2027. We can't wait to celebrate with you!"
        />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          {formState.status === 'success' ? (
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-olive-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl text-cream mb-2">Thank You!</h2>
              <p className="text-olive-300">{formState.message}</p>
            </div>
          ) : formState.status === 'error' ? (
            <div className="bg-black/50 border border-red-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-900/50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl text-cream mb-2">Oops!</h2>
              <p className="text-olive-300 mb-4">{formState.message}</p>
              <Button variant="outline" onClick={() => setFormState({ status: 'idle' })}>
                Try Again
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
              <div className="space-y-6">
                {/* Primary Guest Section */}
                <div className="pb-4 border-b border-olive-700">
                  <h3 className="text-lg font-medium text-gold-400 mb-4">Your Information</h3>

                  {/* Name */}
                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                    />

                    {/* Email */}
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Attending */}
                <div>
                  <label className="block text-sm font-medium text-cream mb-2">
                    Will you be attending?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="attending"
                        value="yes"
                        checked={formData.attending === 'yes'}
                        onChange={handleChange}
                        className="w-4 h-4 text-gold-500"
                      />
                      <span className="text-olive-300">Joyfully Accept</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="attending"
                        value="no"
                        checked={formData.attending === 'no'}
                        onChange={handleChange}
                        className="w-4 h-4 text-gold-500"
                      />
                      <span className="text-olive-300">Regretfully Decline</span>
                    </label>
                  </div>
                </div>

                {formData.attending === 'yes' && (
                  <>
                    {/* Dietary Restrictions */}
                    <Input
                      label="Dietary Restrictions or Allergies"
                      name="dietaryRestrictions"
                      value={formData.dietaryRestrictions}
                      onChange={handleChange}
                      placeholder="Please list any dietary needs for your party"
                    />

                    {/* Additional Guests Section */}
                    <div className="pt-4 border-t border-olive-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gold-400">Additional Guests</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addGuest}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Guest
                        </Button>
                      </div>

                      <p className="text-olive-400 text-sm mb-4">
                        Add any family members or guests attending with you, including children.
                      </p>

                      {additionalGuests.length === 0 ? (
                        <p className="text-olive-500 text-sm italic">No additional guests added.</p>
                      ) : (
                        <div className="space-y-4">
                          {additionalGuests.map((guest, index) => (
                            <div
                              key={guest.id}
                              className="bg-olive-900/30 border border-olive-700 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-cream">
                                  Guest {index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeGuest(guest.id)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                  title="Remove guest"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              <div className="space-y-3">
                                <div className="flex gap-4 items-center">
                                  <input
                                    type="text"
                                    value={guest.name}
                                    onChange={(e) => updateGuest(guest.id, 'name', e.target.value)}
                                    placeholder="Guest name"
                                    className="flex h-10 flex-1 rounded-md border border-olive-600 bg-charcoal text-cream px-3 py-2 text-sm transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                                  />

                                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={guest.isChild}
                                      onChange={(e) => updateGuest(guest.id, 'isChild', e.target.checked)}
                                      className="w-4 h-4 rounded border-olive-600 bg-charcoal text-gold-500 focus:ring-gold-500/20"
                                    />
                                    <span className="text-olive-300 text-sm">Child</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Song Request */}
                    <Input
                      label="Song Request"
                      name="songRequest"
                      value={formData.songRequest}
                      onChange={handleChange}
                      placeholder="What song will get you on the dance floor?"
                    />
                  </>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-cream mb-2">
                    Message for the Couple (Optional)
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="flex w-full rounded-md border border-olive-600 bg-charcoal text-cream px-4 py-3 text-base transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    placeholder="Share a message with Nate & Blake..."
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={formState.status === 'loading'}
                >
                  Submit RSVP
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
