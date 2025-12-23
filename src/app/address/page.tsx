'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, CelebrationAnimation } from '@/components/ui';
import { PageEffects, AnimatedHeader } from '@/components/ui/PageEffects';
import type { FormState } from '@/types';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export default function AddressPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [showCelebration, setShowCelebration] = useState(false);
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

  // Turnstile captcha state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Load Turnstile script and render widget
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const renderTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
          theme: 'dark',
        });
      }
    };

    // Check if script is already loaded
    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    // Load the Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = renderTurnstile;
    document.head.appendChild(script);

    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [turnstileSiteKey]);

  // Reset Turnstile after successful submission or error
  const resetTurnstile = () => {
    setTurnstileToken(null);
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  };

  // Address validation state
  const [validatedAddress, setValidatedAddress] = useState<{
    street_address: string;
    street_address_2: string;
    city: string;
    state: string;
    postal_code: string;
    is_valid: boolean;
    is_standardized: boolean;
  } | null>(null);
  const [showAddressConfirm, setShowAddressConfirm] = useState(false);
  const [addressValidating, setAddressValidating] = useState(false);

  // Submit the address to the API
  const submitAddress = async (addressToSubmit: typeof formData) => {
    const response = await fetch('/api/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addressToSubmit,
        turnstileToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      resetTurnstile();
      throw new Error(result.error || 'Failed to submit address');
    }

    setFormState({
      status: 'success',
      message: result.message || 'Thank you! Your address has been saved.',
    });
    setShowCelebration(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify captcha if Turnstile is configured
    if (turnstileSiteKey && !turnstileToken) {
      setFormState({
        status: 'error',
        message: 'Please complete the captcha verification.',
      });
      return;
    }

    setFormState({ status: 'loading' });

    // Only validate US addresses
    if (formData.country !== 'United States') {
      try {
        await submitAddress(formData);
      } catch (error) {
        setFormState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        });
      }
      return;
    }

    // Validate address with USPS
    setAddressValidating(true);
    try {
      const validateResponse = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street_address: formData.streetAddress,
          street_address_2: formData.streetAddress2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
        }),
      });

      const validateResult = await validateResponse.json();

      if (!validateResult.is_valid) {
        // Address couldn't be validated - show warning but allow continue
        setFormState({
          status: 'error',
          message: validateResult.error || 'We couldn\'t verify this address. Please double-check it or try again.',
        });
        setAddressValidating(false);
        return;
      }

      if (validateResult.is_standardized) {
        // Address was corrected/standardized - ask user to confirm
        setValidatedAddress(validateResult);
        setShowAddressConfirm(true);
        setAddressValidating(false);
        setFormState({ status: 'idle' });
      } else {
        // Address is valid and unchanged - proceed with submission
        await submitAddress(formData);
      }
    } catch (error) {
      console.error('Address validation error:', error);
      // If validation fails, try to submit anyway
      try {
        await submitAddress(formData);
      } catch (submitError) {
        setFormState({
          status: 'error',
          message: submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setAddressValidating(false);
    }
  };

  // Accept the USPS-standardized address and submit
  const acceptStandardizedAddress = async () => {
    if (!validatedAddress) return;

    const updatedFormData = {
      ...formData,
      streetAddress: validatedAddress.street_address,
      streetAddress2: validatedAddress.street_address_2,
      city: validatedAddress.city,
      state: validatedAddress.state,
      postalCode: validatedAddress.postal_code,
    };

    setFormData(updatedFormData);
    setShowAddressConfirm(false);
    setFormState({ status: 'loading' });

    try {
      await submitAddress(updatedFormData);
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  // Keep the original address and submit
  const keepOriginalAddress = async () => {
    setShowAddressConfirm(false);
    setFormState({ status: 'loading' });

    try {
      await submitAddress(formData);
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
    <div className="min-h-screen bg-charcoal py-12 px-4 relative overflow-hidden">
      <PageEffects variant="subtle" />
      <CelebrationAnimation isActive={showCelebration} />
      <div className="max-w-xl mx-auto relative z-10">
        {/* Header */}
        <AnimatedHeader
          title="You're On Our List!"
          subtitle="October 31, 2027"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-8"
        >
          <p className="text-olive-300 max-w-md mx-auto mb-4">
            We&apos;re so excited to share our big day with you! Please provide your mailing address so we can send you a save the date and, when the time comes, your formal invitation.
          </p>
          <p className="text-olive-400 text-sm max-w-md mx-auto">
            Save the dates will be mailed around Halloween 2026, with formal invitations following in April 2027.
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
              <p className="text-olive-300 mb-4">{formState.message}</p>
              <p className="text-olive-400 text-sm mb-2">
                A confirmation email has been sent to your inbox.
              </p>
              <p className="text-olive-400 text-sm">
                Keep an eye on your mailbox for a save the date, and later, your formal invitation!
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
                      label="Phone Number"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
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

                {/* Turnstile Captcha */}
                {turnstileSiteKey && (
                  <div className="flex justify-center pt-4">
                    <div ref={turnstileRef} />
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={formState.status === 'loading' || addressValidating}
                    disabled={turnstileSiteKey ? !turnstileToken : false}
                  >
                    {addressValidating ? 'Validating Address...' : 'Submit Address'}
                  </Button>
                </div>

                <p className="text-olive-500 text-sm text-center">
                  Already submitted? No problem! Enter your email again to update your address. Moving soon? You can update anytime before we send out the invitations.
                </p>
              </div>
            </form>
          )}

          {/* Address Confirmation Modal */}
          <AnimatePresence>
            {showAddressConfirm && validatedAddress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                onClick={() => setShowAddressConfirm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-charcoal border border-olive-600 rounded-lg shadow-elegant p-6 max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-cream">Standardized Address Found</h3>
                  </div>

                  <p className="text-olive-300 text-sm mb-4">
                    USPS suggests this standardized format for your address. Would you like to use it?
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Original Address */}
                    <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-3">
                      <p className="text-xs text-olive-400 uppercase tracking-wide mb-2">Your Entry</p>
                      <p className="text-cream text-sm">
                        {formData.streetAddress}
                        {formData.streetAddress2 && <><br />{formData.streetAddress2}</>}
                        <br />
                        {formData.city}, {formData.state} {formData.postalCode}
                      </p>
                    </div>

                    {/* Standardized Address */}
                    <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-3">
                      <p className="text-xs text-gold-400 uppercase tracking-wide mb-2">USPS Standard</p>
                      <p className="text-cream text-sm">
                        {validatedAddress.street_address}
                        {validatedAddress.street_address_2 && <><br />{validatedAddress.street_address_2}</>}
                        <br />
                        {validatedAddress.city}, {validatedAddress.state} {validatedAddress.postal_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={keepOriginalAddress}
                      className="flex-1"
                    >
                      Keep Original
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={acceptStandardizedAddress}
                      className="flex-1"
                    >
                      Use USPS Format
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
