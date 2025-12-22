'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, CelebrationAnimation, PageEffects, AnimatedHeader, AnimatedGoldLine } from '@/components/ui';
import type { MealChoice, FormState } from '@/types';

// Helper to convert VAPID key for push subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// US States for address form
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

interface AdditionalGuest {
  id: string;
  name: string;
  mealChoice: MealChoice | '';
  isChild: boolean;
}

interface AddressData {
  id?: string;
  name?: string;
  phone?: string;
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

interface HouseholdRSVP {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  additional_guests: AdditionalGuest[];
}

interface ExistingRSVP {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  additional_guests: AdditionalGuest[];
  song_request: string | null;
  message: string | null;
}

type WizardStep = 'email' | 'household-choice' | 'info' | 'rsvp' | 'success';
type LookupStatus = 'existing_rsvp' | 'household_found' | 'address_found' | 'new_guest';

// Event display names and order
const EVENT_INFO: Record<string, { name: string; date: string; order: number }> = {
  rehearsal_dinner: { name: 'Rehearsal Dinner', date: 'October 30, 2027', order: 1 },
  ceremony: { name: 'Wedding Ceremony', date: 'October 31, 2027', order: 2 },
  cocktail: { name: 'Cocktail Hour', date: 'October 31, 2027', order: 3 },
  reception: { name: 'Reception', date: 'October 31, 2027', order: 4 },
  sendoff: { name: 'Send-off', date: 'October 31, 2027', order: 5 },
  sunday_brunch: { name: 'Sunday Brunch', date: 'November 1, 2027', order: 6 },
};

export default function RSVPPage() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('email');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const [showCelebration, setShowCelebration] = useState(false);

  // Lookup state
  const [email, setEmail] = useState('');
  const [lookupStatus, setLookupStatus] = useState<LookupStatus | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [existingRsvp, setExistingRsvp] = useState<ExistingRSVP | null>(null);
  const [existingAddress, setExistingAddress] = useState<AddressData | null>(null);
  const [householdRsvps, setHouseholdRsvps] = useState<HouseholdRSVP[]>([]);
  const [selectedHouseholdRsvp, setSelectedHouseholdRsvp] = useState<HouseholdRSVP | null>(null);

  // Event invitation state
  const [invitedEvents, setInvitedEvents] = useState<string[]>([]);
  const [eventResponses, setEventResponses] = useState<Record<string, boolean>>({});

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    attending: '',
    mealChoice: '' as MealChoice | '',
    dietaryRestrictions: '',
    songRequest: '',
    message: '',
  });

  // Address data (for new guests)
  const [addressData, setAddressData] = useState({
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
  });

  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>([]);

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

  // Push notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check notification permission and subscription status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        alert('Please enable notifications to receive wedding day updates.');
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        setSubscribing(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (response.ok) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  // Email lookup
  const handleEmailLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState({ status: 'loading' });

    try {
      const response = await fetch('/api/rsvp/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to look up email');
      }

      setLookupStatus(result.status);
      setWelcomeMessage(result.message || '');

      // Set invited events from lookup
      if (result.invitedEvents) {
        setInvitedEvents(result.invitedEvents);
        // Initialize event responses - default all to true if attending
        const initialResponses: Record<string, boolean> = {};
        for (const evt of result.invitedEvents) {
          initialResponses[evt] = result.eventResponses?.[evt] ?? true;
        }
        setEventResponses(result.eventResponses || initialResponses);
      }

      if (result.status === 'existing_rsvp') {
        // Pre-fill form with existing RSVP data
        const rsvp = result.rsvp as ExistingRSVP;
        setExistingRsvp(rsvp);
        setFormData({
          name: rsvp.name,
          phone: '',
          attending: rsvp.attending ? 'yes' : 'no',
          mealChoice: (rsvp.meal_choice as MealChoice) || '',
          dietaryRestrictions: rsvp.dietary_restrictions || '',
          songRequest: rsvp.song_request || '',
          message: rsvp.message || '',
        });
        // Convert additional guests with proper IDs
        const guests = (rsvp.additional_guests || []).map((g, i) => ({
          id: `existing-${i}`,
          name: g.name,
          mealChoice: (g.mealChoice as MealChoice) || '',
          isChild: g.isChild,
        }));
        setAdditionalGuests(guests);
        // Set event responses from existing data
        if (result.eventResponses) {
          setEventResponses(result.eventResponses);
        }
        setStep('rsvp');
      } else if (result.status === 'household_found') {
        // Show household choice
        setExistingAddress(result.address);
        setHouseholdRsvps(result.householdRsvps || []);
        setFormData(prev => ({
          ...prev,
          name: result.address?.name || '',
          phone: result.address?.phone || '',
        }));
        setStep('household-choice');
      } else if (result.status === 'address_found') {
        // Pre-fill name from address, skip address collection
        setExistingAddress(result.address);
        setFormData(prev => ({
          ...prev,
          name: result.address?.name || '',
          phone: result.address?.phone || '',
        }));
        setStep('rsvp');
      } else {
        // New guest - collect info and address
        setStep('info');
      }

      setFormState({ status: 'idle' });
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  // Handle household choice
  const handleJoinHousehold = async (householdRsvp: HouseholdRSVP) => {
    setSelectedHouseholdRsvp(householdRsvp);
    setFormState({ status: 'loading' });

    try {
      const response = await fetch('/api/rsvp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdRsvpId: householdRsvp.id,
          name: formData.name || existingAddress?.name,
          email: email.trim().toLowerCase(),
          existingAddressId: existingAddress?.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join household');
      }

      setFormState({
        status: 'success',
        message: result.message,
      });
      setShowCelebration(true);
      setStep('success');
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  const handleSubmitSeparate = () => {
    // User wants their own RSVP
    setStep('rsvp');
    setFormState({ status: 'idle' });
  };

  // Handle info step (new guests) - validates address with USPS
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate US addresses
    if (addressData.country !== 'United States') {
      setStep('rsvp');
      return;
    }

    setAddressValidating(true);
    try {
      const response = await fetch('/api/address/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street_address: addressData.street_address,
          street_address_2: addressData.street_address_2,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
        }),
      });

      const result = await response.json();

      if (!result.is_valid) {
        // Address couldn't be validated - show warning but allow continue
        setFormState({
          status: 'error',
          message: result.error || 'We couldn\'t verify this address. Please double-check it or continue anyway.',
        });
        setAddressValidating(false);
        return;
      }

      if (result.is_standardized) {
        // Address was corrected/standardized - ask user to confirm
        setValidatedAddress(result);
        setShowAddressConfirm(true);
      } else {
        // Address is valid and unchanged - proceed
        setStep('rsvp');
      }
    } catch (error) {
      console.error('Address validation error:', error);
      // If validation fails, allow user to continue
      setStep('rsvp');
    } finally {
      setAddressValidating(false);
    }
  };

  // Accept the USPS-standardized address
  const acceptStandardizedAddress = () => {
    if (validatedAddress) {
      setAddressData(prev => ({
        ...prev,
        street_address: validatedAddress.street_address,
        street_address_2: validatedAddress.street_address_2,
        city: validatedAddress.city,
        state: validatedAddress.state,
        postal_code: validatedAddress.postal_code,
      }));
    }
    setShowAddressConfirm(false);
    setStep('rsvp');
  };

  // Keep the original address as entered
  const keepOriginalAddress = () => {
    setShowAddressConfirm(false);
    setStep('rsvp');
  };

  // Handle RSVP submission
  const handleRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate additional guests have names
    const guestsWithoutNames = additionalGuests.filter(g => g.name.trim() === '');
    if (guestsWithoutNames.length > 0) {
      setFormState({
        status: 'error',
        message: 'Please provide a name for all additional guests.',
      });
      return;
    }

    setFormState({ status: 'loading' });

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: email.trim().toLowerCase(),
        attending: formData.attending,
        mealChoice: formData.mealChoice,
        dietaryRestrictions: formData.dietaryRestrictions,
        songRequest: formData.songRequest,
        message: formData.message,
        additionalGuests: additionalGuests.filter(g => g.name.trim() !== ''),
      };

      // Include address for new guests
      if (lookupStatus === 'new_guest' && addressData.street_address) {
        payload.address = {
          phone: formData.phone,
          street_address: addressData.street_address,
          street_address_2: addressData.street_address_2,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
          country: addressData.country,
        };
      }

      // Include existing address ID if available
      if (existingAddress?.id) {
        payload.existingAddressId = existingAddress.id;
      }

      // Include event responses if attending
      if (formData.attending === 'yes' && Object.keys(eventResponses).length > 0) {
        payload.eventResponses = eventResponses;
      }

      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      setStep('success');
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

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAddressData(prev => ({ ...prev, [name]: value }));
  };

  const toggleEventResponse = (eventSlug: string) => {
    setEventResponses(prev => ({
      ...prev,
      [eventSlug]: !prev[eventSlug],
    }));
  };

  // Get sorted invited events for display
  const sortedInvitedEvents = [...invitedEvents].sort((a, b) => {
    return (EVENT_INFO[a]?.order || 99) - (EVENT_INFO[b]?.order || 99);
  });

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

  const goBack = () => {
    if (step === 'household-choice' || step === 'info') {
      setStep('email');
    } else if (step === 'rsvp') {
      if (lookupStatus === 'new_guest') {
        setStep('info');
      } else if (lookupStatus === 'household_found') {
        setStep('household-choice');
      } else {
        setStep('email');
      }
    }
    setFormState({ status: 'idle' });
  };

  // RSVP availability window
  const now = new Date();
  // Testing: Allow RSVP through 1/1/2026
  const testEnd = new Date('2026-01-01T23:59:59');
  const inTestWindow = now <= testEnd;
  const prodStart = new Date('2027-04-01T00:00:00');
  const prodEnd = new Date('2027-09-01T23:59:59');
  const inProdWindow = now >= prodStart && now <= prodEnd;

  const rsvpOpen = inTestWindow || inProdWindow;
  const rsvpStatus = rsvpOpen ? 'open' : now < prodStart ? 'not-yet' : 'closed';

  // Before April 1, 2027 (and after test window) - not yet accepting RSVPs
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
      <PageEffects variant="subtle" showRings={false} />
      <CelebrationAnimation isActive={showCelebration} />

      <div className="container-wedding relative z-10">
        <AnimatedHeader
          subtitle="RSVP"
          title="Will You Join Us?"
          description="Please respond by September 1, 2027. We can't wait to celebrate with you!"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {/* Success State */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Thank You Card */}
                <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-olive-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="font-heading text-2xl text-cream mb-2">Thank You!</h2>
                  <p className="text-olive-300">{formState.message}</p>
                </div>

                {/* Push Notification Signup - Only show if attending */}
                {formData.attending === 'yes' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-black/50 border border-gold-500/30 rounded-lg shadow-elegant p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 flex-shrink-0 bg-gold-500/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🔔</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg text-gold-400 mb-2">
                          Get Wedding Day Updates
                        </h3>
                        <p className="text-olive-300 text-sm mb-4">
                          Enable push notifications to receive real-time updates on the wedding day - ceremony timing, reception announcements, and celebration moments!
                        </p>

                        {isSubscribed ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Notifications enabled! You&apos;re all set.</span>
                          </div>
                        ) : notificationPermission === 'denied' ? (
                          <p className="text-olive-400 text-sm">
                            Notifications are blocked. Please enable them in your browser settings to receive updates.
                          </p>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={subscribeToPush}
                            isLoading={subscribing}
                          >
                            Enable Notifications
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Error State (can appear in any step) */}
            {formState.status === 'error' && step !== 'success' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-black/50 border border-red-700 rounded-lg shadow-elegant p-8 text-center mb-6"
              >
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
              </motion.div>
            )}

            {/* Step 1: Email Entry */}
            {step === 'email' && formState.status !== 'error' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <form onSubmit={handleEmailLookup} className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gold-400 mb-2">Let&apos;s Get Started</h3>
                    <p className="text-olive-300 text-sm">
                      Enter your email address and we&apos;ll check if you&apos;ve already RSVPed or if we have your information on file.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      autoFocus
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      isLoading={formState.status === 'loading'}
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step: Household Choice */}
            {step === 'household-choice' && formState.status !== 'error' && (
              <motion.div
                key="household"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-olive-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-heading text-cream mb-2">{welcomeMessage}</h3>
                  </div>

                  {householdRsvps.map((rsvp) => (
                    <div key={rsvp.id} className="bg-olive-900/30 border border-olive-700 rounded-lg p-4 mb-4">
                      <p className="text-cream font-medium">{rsvp.name}</p>
                      <p className="text-olive-400 text-sm">
                        {rsvp.attending ? 'Attending' : 'Not attending'}
                        {rsvp.additional_guests && rsvp.additional_guests.length > 0 && (
                          <> with {rsvp.additional_guests.length} guest{rsvp.additional_guests.length > 1 ? 's' : ''}</>
                        )}
                      </p>
                    </div>
                  ))}

                  <p className="text-olive-300 text-sm mb-6 text-center">
                    Would you like to join their party or submit your own RSVP?
                  </p>

                  <div className="space-y-3">
                    {householdRsvps.map((rsvp) => (
                      <Button
                        key={rsvp.id}
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleJoinHousehold(rsvp)}
                        isLoading={formState.status === 'loading' && selectedHouseholdRsvp?.id === rsvp.id}
                      >
                        Add me to {rsvp.name}&apos;s party
                      </Button>
                    ))}

                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      onClick={handleSubmitSeparate}
                    >
                      Submit my own RSVP
                    </Button>

                    <button
                      type="button"
                      onClick={goBack}
                      className="w-full text-olive-400 hover:text-olive-300 text-sm py-2"
                    >
                      &larr; Use a different email
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step: Info Collection (new guests) */}
            {step === 'info' && formState.status !== 'error' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <form onSubmit={handleInfoSubmit} className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gold-400 mb-2">Your Information</h3>
                    <p className="text-olive-300 text-sm">
                      We&apos;ll need your contact info and mailing address for your invitation.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="pb-4 border-b border-olive-700">
                      <h4 className="text-sm font-medium text-gold-400 mb-4">Contact Details</h4>
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
                      <h4 className="text-sm font-medium text-gold-400 mb-4">Mailing Address</h4>
                      <div className="space-y-4">
                        <Input
                          label="Street Address"
                          name="street_address"
                          value={addressData.street_address}
                          onChange={handleAddressChange}
                          required
                          placeholder="123 Main Street"
                        />
                        <Input
                          label="Apartment, Suite, etc. (Optional)"
                          name="street_address_2"
                          value={addressData.street_address_2}
                          onChange={handleAddressChange}
                          placeholder="Apt 4B"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="City"
                            name="city"
                            value={addressData.city}
                            onChange={handleAddressChange}
                            required
                            placeholder="City"
                          />
                          <div>
                            <label className="block text-sm font-medium text-cream mb-2">
                              State
                            </label>
                            <select
                              name="state"
                              value={addressData.state}
                              onChange={handleAddressChange}
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
                            name="postal_code"
                            value={addressData.postal_code}
                            onChange={handleAddressChange}
                            required
                            placeholder="12345"
                          />
                          <div>
                            <label className="block text-sm font-medium text-cream mb-2">
                              Country
                            </label>
                            <select
                              name="country"
                              value={addressData.country}
                              onChange={handleAddressChange}
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

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="flex-1"
                        disabled={addressValidating}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        isLoading={addressValidating}
                      >
                        {addressValidating ? 'Validating Address...' : 'Continue to RSVP'}
                      </Button>
                    </div>
                  </div>
                </form>

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
                              {addressData.street_address}
                              {addressData.street_address_2 && <><br />{addressData.street_address_2}</>}
                              <br />
                              {addressData.city}, {addressData.state} {addressData.postal_code}
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
            )}

            {/* Step: RSVP Form */}
            {step === 'rsvp' && formState.status !== 'error' && (
              <motion.div
                key="rsvp"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <form onSubmit={handleRSVPSubmit} className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
                  {/* Welcome back message */}
                  {welcomeMessage && (
                    <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-4 mb-6 text-center">
                      <p className="text-olive-300">{welcomeMessage}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Primary Guest Section */}
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
                          disabled={lookupStatus === 'existing_rsvp'}
                        />

                        {/* Show email as read-only */}
                        <div>
                          <label className="block text-sm font-medium text-cream mb-2">
                            Email Address
                          </label>
                          <div className="flex h-11 w-full rounded-md border border-olive-600 bg-olive-900/50 text-olive-400 px-4 py-2 text-base items-center">
                            {email}
                          </div>
                        </div>
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
                        {/* Event Selection - Only show if there are events to select */}
                        {sortedInvitedEvents.length > 0 && (
                          <div className="pt-4 border-t border-olive-700">
                            <h3 className="text-lg font-medium text-gold-400 mb-3">Which events will you attend?</h3>
                            <p className="text-olive-400 text-sm mb-4">
                              Please check all events you plan to attend.
                            </p>
                            <div className="space-y-3">
                              {sortedInvitedEvents.map((eventSlug) => {
                                const info = EVENT_INFO[eventSlug] || { name: eventSlug, date: '' };
                                return (
                                  <label
                                    key={eventSlug}
                                    className="flex items-start gap-3 p-3 bg-olive-900/30 border border-olive-700 rounded-lg cursor-pointer hover:border-olive-600 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={eventResponses[eventSlug] ?? true}
                                      onChange={() => toggleEventResponse(eventSlug)}
                                      className="w-5 h-5 mt-0.5 rounded border-olive-600 bg-charcoal text-gold-500 focus:ring-gold-500/20"
                                    />
                                    <div className="flex-1">
                                      <span className="text-cream font-medium">{info.name}</span>
                                      {info.date && (
                                        <span className="text-olive-400 text-sm ml-2">({info.date})</span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

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
                                        placeholder="Guest name (required)"
                                        required
                                        className={`flex h-10 flex-1 rounded-md border bg-charcoal text-cream px-3 py-2 text-sm transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 ${
                                          guest.name.trim() === '' ? 'border-red-500/50' : 'border-olive-600'
                                        }`}
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

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="flex-1"
                        isLoading={formState.status === 'loading'}
                      >
                        {existingRsvp ? 'Update RSVP' : 'Submit RSVP'}
                      </Button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
