'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import type { FormState } from '@/types';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export default function AddressPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    try {
      const response = await fetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit address');
      }

      setFormState({
        status: 'success',
        message: result.message || 'Thank you! Your address has been saved.',
      });
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-charcoal py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="font-accent text-4xl text-gold-500 mb-2">
            Nate & Blake
          </p>
          <h1 className="font-heading text-3xl text-cream mb-4">
            Share Your Address
          </h1>
          <div className="gold-line mx-auto mb-6" />
          <p className="text-olive-300 max-w-md mx-auto">
            Help us make sure you receive your wedding invitation and other important updates!
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {formState.status === 'success' ? (
            <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-olive-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-heading text-2xl text-cream mb-2">Thank You!</h2>
              <p className="text-olive-300 mb-6">{formState.message}</p>
              <p className="text-olive-400 text-sm">
                A confirmation email has been sent to your inbox.
              </p>
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
                {/* Contact Information */}
                <div className="pb-4 border-b border-olive-700">
                  <h3 className="text-lg font-medium text-gold-400 mb-4">Your Information</h3>
                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                    />
                    <Input
                      label="Phone Number (Optional)"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* Mailing Address */}
                <div>
                  <h3 className="text-lg font-medium text-gold-400 mb-4">Mailing Address</h3>
                  <div className="space-y-4">
                    <Input
                      label="Street Address"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleChange}
                      required
                      placeholder="123 Main Street"
                    />
                    <Input
                      label="Apartment, Suite, etc. (Optional)"
                      name="streetAddress2"
                      value={formData.streetAddress2}
                      onChange={handleChange}
                      placeholder="Apt 4B"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="City"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        placeholder="City"
                      />
                      <div>
                        <label className="block text-sm font-medium text-cream mb-2">
                          State
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          required
                          className="flex h-11 w-full rounded-md border border-olive-600 bg-charcoal text-cream px-4 py-2 text-base transition-colors focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                        >
                          <option value="">Select</option>
                          {US_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="ZIP Code"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        required
                        placeholder="12345"
                      />
                      <div>
                        <label className="block text-sm font-medium text-cream mb-2">
                          Country
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-olive-600 bg-charcoal text-cream px-4 py-2 text-base transition-colors focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                        >
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={formState.status === 'loading'}
                  >
                    Submit Address
                  </Button>
                </div>

                <p className="text-olive-500 text-sm text-center">
                  Already submitted? No problem! Just enter your email again to update your address.
                </p>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-olive-500 text-sm">
            October 31, 2027
          </p>
          <p className="text-gold-500 text-sm mt-1">
            #NateAndBlakeSayIDo2027
          </p>
        </motion.div>
      </div>
    </div>
  );
}
