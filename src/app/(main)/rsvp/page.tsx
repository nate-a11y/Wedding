'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import type { MealChoice, FormState } from '@/types';

export default function RSVPPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: '',
    mealChoice: '' as MealChoice | '',
    dietaryRestrictions: '',
    plusOne: '',
    plusOneName: '',
    plusOneMealChoice: '' as MealChoice | '',
    songRequest: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    // Simulate form submission - will be connected to Supabase
    await new Promise(resolve => setTimeout(resolve, 1500));

    setFormState({
      status: 'success',
      message: 'Thank you for your RSVP! We\'ll be in touch soon.',
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // RSVP not yet open
  const rsvpOpen = false;

  if (!rsvpOpen) {
    return (
      <div className="section-padding bg-cream min-h-[80vh] flex items-center">
        <div className="container-wedding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="font-accent text-3xl text-gold-500 mb-4">RSVP</p>
            <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
              Coming Soon
            </h1>
            <div className="gold-line mx-auto mb-8" />

            <div className="bg-white rounded-lg shadow-elegant p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-olive-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-olive-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <p className="text-olive-700 text-lg mb-6">
                We&apos;re not quite ready for RSVPs yet! Save the dates will be going out soon,
                and we&apos;ll open RSVPs closer to the wedding date.
              </p>

              <div className="bg-olive-50 rounded-lg p-4">
                <p className="text-olive-600 text-sm">
                  <strong>Save the Date:</strong> October 31, 2027
                </p>
                <p className="text-olive-500 text-sm mt-1">
                  Formal invitations and RSVP details coming later
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-cream">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">RSVP</p>
          <h1 className="font-heading text-4xl md:text-5xl text-charcoal mb-6">
            Will You Join Us?
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-700 max-w-2xl mx-auto text-lg">
            Please respond by [Date TBA]. We can&apos;t wait to celebrate with you!
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          {formState.status === 'success' ? (
            <div className="bg-white rounded-lg shadow-elegant p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-olive-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-olive-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl text-charcoal mb-2">Thank You!</h2>
              <p className="text-olive-600">{formState.message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-elegant p-8">
              <div className="space-y-6">
                {/* Name */}
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

                {/* Attending */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
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
                        className="w-4 h-4 text-olive-500"
                      />
                      <span className="text-olive-700">Joyfully Accept</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="attending"
                        value="no"
                        checked={formData.attending === 'no'}
                        onChange={handleChange}
                        className="w-4 h-4 text-olive-500"
                      />
                      <span className="text-olive-700">Regretfully Decline</span>
                    </label>
                  </div>
                </div>

                {formData.attending === 'yes' && (
                  <>
                    {/* Meal Choice */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">
                        Meal Preference
                      </label>
                      <select
                        name="mealChoice"
                        value={formData.mealChoice}
                        onChange={handleChange}
                        className="flex h-11 w-full rounded-md border border-olive-200 bg-white px-4 py-2 text-base transition-colors focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20"
                      >
                        <option value="">Select an option</option>
                        <option value="chicken">Chicken</option>
                        <option value="beef">Beef</option>
                        <option value="fish">Fish</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                      </select>
                    </div>

                    {/* Dietary Restrictions */}
                    <Input
                      label="Dietary Restrictions or Allergies"
                      name="dietaryRestrictions"
                      value={formData.dietaryRestrictions}
                      onChange={handleChange}
                      placeholder="Please list any dietary needs"
                    />

                    {/* Plus One */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">
                        Bringing a guest?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="plusOne"
                            value="yes"
                            checked={formData.plusOne === 'yes'}
                            onChange={handleChange}
                            className="w-4 h-4 text-olive-500"
                          />
                          <span className="text-olive-700">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="plusOne"
                            value="no"
                            checked={formData.plusOne === 'no'}
                            onChange={handleChange}
                            className="w-4 h-4 text-olive-500"
                          />
                          <span className="text-olive-700">No</span>
                        </label>
                      </div>
                    </div>

                    {formData.plusOne === 'yes' && (
                      <>
                        <Input
                          label="Guest Name"
                          name="plusOneName"
                          value={formData.plusOneName}
                          onChange={handleChange}
                          placeholder="Enter your guest's name"
                        />
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-2">
                            Guest Meal Preference
                          </label>
                          <select
                            name="plusOneMealChoice"
                            value={formData.plusOneMealChoice}
                            onChange={handleChange}
                            className="flex h-11 w-full rounded-md border border-olive-200 bg-white px-4 py-2 text-base transition-colors focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20"
                          >
                            <option value="">Select an option</option>
                            <option value="chicken">Chicken</option>
                            <option value="beef">Beef</option>
                            <option value="fish">Fish</option>
                            <option value="vegetarian">Vegetarian</option>
                            <option value="vegan">Vegan</option>
                          </select>
                        </div>
                      </>
                    )}

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
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Message for the Couple (Optional)
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="flex w-full rounded-md border border-olive-200 bg-white px-4 py-3 text-base transition-colors placeholder:text-olive-400 focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20"
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
