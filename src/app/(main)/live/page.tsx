'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageEffects } from '@/components/ui';

interface LiveUpdate {
  id: string;
  message: string;
  type: 'info' | 'action' | 'celebration';
  posted_by: string | null;
  pinned: boolean;
  created_at: string;
}

// Wedding date - only show live feed on wedding day
const WEDDING_DATE = new Date('2027-10-31');

function isWeddingDay(): boolean {
  const now = new Date();
  const weddingStart = new Date(WEDDING_DATE);
  weddingStart.setHours(0, 0, 0, 0);
  const weddingEnd = new Date(WEDDING_DATE);
  weddingEnd.setDate(weddingEnd.getDate() + 1);
  weddingEnd.setHours(6, 0, 0, 0); // Include early morning hours after midnight

  // For testing: allow access before wedding too (remove in production)
  const testingBypass = now < new Date('2026-01-01');

  return testingBypass || (now >= weddingStart && now < weddingEnd);
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getTypeStyles(type: string): { bg: string; border: string; icon: string } {
  switch (type) {
    case 'celebration':
      return {
        bg: 'bg-gold-500/20',
        border: 'border-gold-500',
        icon: '🎉',
      };
    case 'action':
      return {
        bg: 'bg-orange-500/20',
        border: 'border-orange-500',
        icon: '📢',
      };
    default:
      return {
        bg: 'bg-olive-700/50',
        border: 'border-olive-600',
        icon: 'ℹ️',
      };
  }
}

export default function LiveFeedPage() {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const fetchUpdates = useCallback(async () => {
    try {
      const response = await fetch('/api/live');
      const data = await response.json();
      if (!data.error) {
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check notification permission and subscription status
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  // Fetch updates and set up polling
  useEffect(() => {
    fetchUpdates();

    // Poll every 30 seconds
    const interval = setInterval(fetchUpdates, 30000);
    return () => clearInterval(interval);
  }, [fetchUpdates]);

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    setSubscribing(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        alert('Please enable notifications to receive wedding day updates.');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
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

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  // Show pre-wedding message if not wedding day
  if (!isWeddingDay()) {
    return (
      <div className="min-h-screen bg-charcoal relative overflow-hidden">
        <PageEffects variant="subtle" />
        <div className="container-wedding py-20 relative z-10">
          <div className="max-w-lg mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-charcoal-light rounded-xl p-8 border border-olive-700"
            >
              <div className="text-6xl mb-4">🎃</div>
              <h1 className="text-2xl font-display text-gold-400 mb-4">
                Live Updates Coming Soon!
              </h1>
              <p className="text-olive-300 mb-6">
                Check back on October 31st, 2027 for real-time updates throughout the wedding day.
              </p>
              <p className="text-olive-400 text-sm">
                You&apos;ll be able to see announcements, timing updates, and celebration moments as they happen!
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const pinnedUpdates = updates.filter((u) => u.pinned);
  const regularUpdates = updates.filter((u) => !u.pinned);
  const latestUpdate = updates[0];

  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      <PageEffects variant="subtle" />
      <div className="container-wedding py-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-display text-gold-400 mb-2">
              Live Updates
            </h1>
            <p className="text-olive-300">Real-time announcements from your celebration</p>
          </motion.div>

          {/* Notification Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            {!isSubscribed ? (
              <button
                onClick={subscribeToPush}
                disabled={subscribing || notificationPermission === 'denied'}
                className="w-full py-3 px-4 bg-gold-500 text-black rounded-lg font-medium
                         hover:bg-gold-400 transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {subscribing ? (
                  'Enabling...'
                ) : notificationPermission === 'denied' ? (
                  'Notifications Blocked'
                ) : (
                  <>
                    <span>🔔</span>
                    <span>Enable Push Notifications</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <span className="text-green-400 flex items-center gap-2">
                  <span>✓</span> Notifications enabled
                </span>
                <button
                  onClick={unsubscribeFromPush}
                  className="text-sm text-olive-400 hover:text-cream"
                >
                  Disable
                </button>
              </div>
            )}
          </motion.div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-olive-400">Loading updates...</p>
            </div>
          )}

          {/* No Updates */}
          {!loading && updates.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-charcoal-light rounded-xl border border-olive-700"
            >
              <div className="text-4xl mb-4">📢</div>
              <p className="text-olive-300">No updates yet. Stay tuned!</p>
            </motion.div>
          )}

          {/* Latest Update - Featured */}
          {latestUpdate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-6 p-6 rounded-xl border-2 ${getTypeStyles(latestUpdate.type).bg} ${getTypeStyles(latestUpdate.type).border}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{getTypeStyles(latestUpdate.type).icon}</span>
                <div className="flex-1">
                  <p className="text-xl text-cream font-medium leading-relaxed">
                    {latestUpdate.message}
                  </p>
                  <p className="text-olive-400 text-sm mt-2">
                    {getRelativeTime(latestUpdate.created_at)}
                    {latestUpdate.posted_by && ` • Posted by ${latestUpdate.posted_by}`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pinned Updates */}
          {pinnedUpdates.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-olive-400 uppercase tracking-wide mb-3">
                📌 Pinned
              </h2>
              <AnimatePresence>
                {pinnedUpdates.map((update) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`mb-3 p-4 rounded-lg border ${getTypeStyles(update.type).bg} ${getTypeStyles(update.type).border}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{getTypeStyles(update.type).icon}</span>
                      <div className="flex-1">
                        <p className="text-cream">{update.message}</p>
                        <p className="text-olive-400 text-sm mt-1">
                          {getRelativeTime(update.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Update History */}
          {regularUpdates.length > 1 && (
            <div>
              <h2 className="text-sm font-medium text-olive-400 uppercase tracking-wide mb-3">
                Earlier Updates
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {regularUpdates.slice(1).map((update) => (
                    <motion.div
                      key={update.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-lg border ${getTypeStyles(update.type).bg} border-olive-700/50`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg opacity-70">{getTypeStyles(update.type).icon}</span>
                        <div className="flex-1">
                          <p className="text-cream/90">{update.message}</p>
                          <p className="text-olive-400 text-sm mt-1">
                            {getRelativeTime(update.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Auto-refresh indicator */}
          <p className="text-center text-olive-500 text-xs mt-8">
            Updates refresh automatically every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper to convert VAPID key
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
