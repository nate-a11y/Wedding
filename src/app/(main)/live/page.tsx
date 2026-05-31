'use client';

import Link from 'next/link';
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

interface HubAction {
  title: string;
  description: string;
  href: string;
  icon: string;
  eyebrow: string;
  primary?: boolean;
}

interface TimelineItem {
  time: string;
  title: string;
  detail: string;
  icon: string;
  startsAt: Date;
}

// Wedding day window includes the after-party hours after midnight.
const WEDDING_START = new Date('2027-10-31T00:00:00-05:00');
const WEDDING_END = new Date('2027-11-01T06:00:00-05:00');
const VENUE_ADDRESS = 'The Callaway Jewel, 4910 County Rd 105, Fulton, MO 65251';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE_ADDRESS)}`;

const hubActions: HubAction[] = [
  {
    title: 'Add Photos',
    description: 'Snap or upload your favorite moments from the dance floor, tables, and after-party.',
    href: '/photos',
    icon: '📸',
    eyebrow: 'Most used today',
    primary: true,
  },
  {
    title: 'Sign the Guest Book',
    description: 'Leave Nate & Blake a text, audio, or video message they can replay forever.',
    href: '/guestbook',
    icon: '💌',
    eyebrow: 'Leave some love',
  },
  {
    title: 'Request a Song',
    description: 'Vote for favorites or send the DJ one more must-play track.',
    href: '/songs',
    icon: '🎶',
    eyebrow: 'Build the playlist',
  },
  {
    title: 'Watch Livestream',
    description: 'Share the ceremony link with anyone celebrating from afar.',
    href: '/livestream',
    icon: '🎥',
    eyebrow: 'Remote guests',
  },
];

const timeline: TimelineItem[] = [
  {
    time: '3:30 PM',
    title: 'Guest Arrival',
    detail: 'Give yourself a few extra minutes to park, find a seat, and say hello.',
    icon: '👋',
    startsAt: new Date('2027-10-31T15:30:00-05:00'),
  },
  {
    time: '4:00 PM',
    title: 'Ceremony',
    detail: 'Please silence phones, then feel free to take photos once the ceremony wraps.',
    icon: '💍',
    startsAt: new Date('2027-10-31T16:00:00-05:00'),
  },
  {
    time: '4:45 PM',
    title: 'Cocktail Hour',
    detail: 'Grab a drink, sign the guest book, and start sharing photos.',
    icon: '🥂',
    startsAt: new Date('2027-10-31T16:45:00-05:00'),
  },
  {
    time: '6:00 PM',
    title: 'Dinner + Toasts',
    detail: 'Find your table, enjoy dinner, and keep an eye here for announcements.',
    icon: '🍽️',
    startsAt: new Date('2027-10-31T18:00:00-05:00'),
  },
  {
    time: '8:00 PM',
    title: 'Dancing',
    detail: 'Dance floor opens. This is the perfect time to request and vote on songs.',
    icon: '🪩',
    startsAt: new Date('2027-10-31T20:00:00-05:00'),
  },
  {
    time: '10:45 PM',
    title: 'Send-off',
    detail: 'Gather outside for Nate & Blake’s grand exit.',
    icon: '✨',
    startsAt: new Date('2027-10-31T22:45:00-05:00'),
  },
];

const infoCards = [
  {
    title: 'Venue',
    value: 'The Callaway Jewel',
    detail: '4910 County Rd 105, Fulton, MO',
    href: MAPS_URL,
    cta: 'Open maps',
    icon: '📍',
  },
  {
    title: 'Dress Code',
    value: 'Formal Attire',
    detail: 'Halloween elegance encouraged — masks optional, joy required.',
    href: '/dress-code',
    cta: 'View details',
    icon: '🖤',
  },
  {
    title: 'Need Help?',
    value: 'Check FAQ',
    detail: 'Parking, timing, travel, and other guest details live here.',
    href: '/faq',
    cta: 'Open FAQ',
    icon: '❓',
  },
];

function isWeddingDay(): boolean {
  const now = new Date();
  return now >= WEDDING_START && now < WEDDING_END;
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

function getTypeStyles(type: string): { bg: string; border: string; icon: string; label: string } {
  switch (type) {
    case 'celebration':
      return {
        bg: 'bg-gold-500/20',
        border: 'border-gold-500',
        icon: '🎉',
        label: 'Celebration',
      };
    case 'action':
      return {
        bg: 'bg-orange-500/20',
        border: 'border-orange-500',
        icon: '📢',
        label: 'Action needed',
      };
    default:
      return {
        bg: 'bg-olive-700/50',
        border: 'border-olive-600',
        icon: 'ℹ️',
        label: 'Update',
      };
  }
}

function DayOfStatus({ isLive }: { isLive: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-olive-600 bg-black/50 px-4 py-2 text-sm text-olive-200 shadow-elegant">
      <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gold-500'}`} />
      {isLive ? 'Live for wedding day' : 'Ready for October 31, 2027'}
    </div>
  );
}

function ActionCard({ action, index }: { action: HubAction; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index }}
      className={action.primary ? 'sm:col-span-2' : undefined}
    >
      <Link
        href={action.href}
        className={`group block h-full rounded-2xl border p-5 shadow-elegant transition-all active:scale-[0.99] ${
          action.primary
            ? 'border-gold-500/70 bg-gradient-to-br from-gold-500/20 via-black/70 to-olive-900/70 hover:border-gold-400'
            : 'border-olive-700 bg-black/50 hover:border-gold-500/70 hover:bg-olive-900/30'
        }`}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-olive-900/80 text-3xl ring-1 ring-olive-700 group-hover:ring-gold-500/60">
            {action.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
              {action.eyebrow}
            </p>
            <h2 className="mb-2 font-heading text-2xl text-cream">{action.title}</h2>
            <p className="mb-0 text-sm leading-relaxed text-olive-200">{action.description}</p>
          </div>
          <span className="mt-1 text-2xl text-gold-400 transition-transform group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function NotificationPanel({
  isSubscribed,
  subscribing,
  notificationPermission,
  onSubscribe,
  onUnsubscribe,
}: {
  isSubscribed: boolean;
  subscribing: boolean;
  notificationPermission: NotificationPermission;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}) {
  if (isSubscribed) {
    return (
      <div className="rounded-2xl border border-green-500/50 bg-green-500/15 p-4 shadow-elegant">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-medium text-green-300">Notifications enabled</p>
            <p className="mb-0 text-sm text-olive-200">You’ll get timing changes and important announcements.</p>
          </div>
          <button
            onClick={onUnsubscribe}
            className="rounded-lg px-3 py-2 text-sm text-olive-300 transition-colors hover:bg-black/30 hover:text-cream"
          >
            Disable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-olive-700 bg-black/50 p-4 shadow-elegant">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 font-medium text-cream">Get live timing alerts</p>
          <p className="mb-0 text-sm text-olive-300">Best for QR scans on wedding day — no app required.</p>
        </div>
        <button
          onClick={onSubscribe}
          disabled={subscribing || notificationPermission === 'denied'}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3 font-semibold text-black transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>🔔</span>
          {subscribing ? 'Enabling...' : notificationPermission === 'denied' ? 'Blocked' : 'Enable alerts'}
        </button>
      </div>
      <p className="mb-0 mt-3 text-xs text-olive-400">
        iPhone users: add this site to your Home Screen first, then reopen it to enable notifications.
      </p>
    </div>
  );
}

function getCurrentTimelineIndex(isLive: boolean): number {
  if (!isLive) return -1;

  const now = new Date();
  let currentIndex = -1;

  timeline.forEach((item, index) => {
    if (now >= item.startsAt) {
      currentIndex = index;
    }
  });

  return currentIndex;
}

function TimelineCard({ isLive }: { isLive: boolean }) {
  const currentTimelineIndex = getCurrentTimelineIndex(isLive);

  return (
    <section className="rounded-3xl border border-olive-700 bg-black/50 p-5 shadow-elegant md:p-7">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">Schedule</p>
          <h2 className="font-heading text-3xl text-cream">Today at a Glance</h2>
        </div>
        <Link href="/events" className="text-sm font-medium text-gold-400 hover:text-gold-300">
          Full event details →
        </Link>
      </div>

      <div className="space-y-4">
        {timeline.map((item, index) => {
          const isCurrent = index === currentTimelineIndex;

          return (
            <div key={`${item.time}-${item.title}`} className="grid grid-cols-[5.25rem_1fr] gap-3 sm:grid-cols-[6.5rem_1fr]">
            <div className="pt-1 text-sm font-semibold text-gold-300">{item.time}</div>
            <div
              className={`rounded-2xl border p-4 ${
                isCurrent ? 'border-gold-500/70 bg-gold-500/10' : 'border-olive-800 bg-olive-900/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-xl text-cream">{item.title}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black">
                        Now
                      </span>
                    )}
                  </div>
                  <p className="mb-0 text-sm leading-relaxed text-olive-300">{item.detail}</p>
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InfoGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {infoCards.map((card) => {
        const isExternal = card.href.startsWith('http');
        const content = (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-3xl" aria-hidden="true">{card.icon}</span>
              <span className="text-sm font-medium text-gold-400">{card.cta} →</span>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-olive-400">{card.title}</p>
            <h3 className="mb-2 font-heading text-2xl text-cream">{card.value}</h3>
            <p className="mb-0 text-sm leading-relaxed text-olive-300">{card.detail}</p>
          </>
        );

        const className = 'group block rounded-2xl border border-olive-700 bg-black/50 p-5 shadow-elegant transition-all hover:border-gold-500/70 hover:bg-olive-900/30';

        return isExternal ? (
          <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer" className={className}>
            {content}
          </a>
        ) : (
          <Link key={card.title} href={card.href} className={className}>
            {content}
          </Link>
        );
      })}
    </section>
  );
}

function UpdatesFeed({ loading, updates }: { loading: boolean; updates: LiveUpdate[] }) {
  const pinnedUpdates = updates.filter((u) => u.pinned);
  const regularUpdates = updates.filter((u) => !u.pinned);
  const latestUpdate = updates[0];

  return (
    <section className="rounded-3xl border border-olive-700 bg-black/50 p-5 shadow-elegant md:p-7">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">Live feed</p>
          <h2 className="font-heading text-3xl text-cream">Announcements</h2>
        </div>
        <p className="mb-0 text-xs text-olive-500">Refreshes every 30 seconds</p>
      </div>

      {loading && (
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
          <p className="mb-0 text-olive-400">Loading updates...</p>
        </div>
      )}

      {!loading && updates.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-olive-800 bg-olive-900/20 p-6 text-center"
        >
          <div className="mb-3 text-4xl">📢</div>
          <p className="mb-1 font-medium text-cream">No live updates yet.</p>
          <p className="mb-0 text-sm text-olive-400">This space will show timing changes, reminders, and celebration moments.</p>
        </motion.div>
      )}

      {latestUpdate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mb-5 rounded-2xl border-2 p-5 ${getTypeStyles(latestUpdate.type).bg} ${getTypeStyles(latestUpdate.type).border}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden="true">{getTypeStyles(latestUpdate.type).icon}</span>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                Latest {getTypeStyles(latestUpdate.type).label}
              </p>
              <p className="mb-0 text-lg font-medium leading-relaxed text-cream">{latestUpdate.message}</p>
              <p className="mb-0 mt-2 text-sm text-olive-400">
                {getRelativeTime(latestUpdate.created_at)}
                {latestUpdate.posted_by && ` • Posted by ${latestUpdate.posted_by}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {pinnedUpdates.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-olive-400">📌 Pinned</h3>
          <AnimatePresence>
            {pinnedUpdates.map((update) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`mb-3 rounded-xl border p-4 ${getTypeStyles(update.type).bg} ${getTypeStyles(update.type).border}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">{getTypeStyles(update.type).icon}</span>
                  <div>
                    <p className="mb-0 text-cream">{update.message}</p>
                    <p className="mb-0 mt-1 text-sm text-olive-400">{getRelativeTime(update.created_at)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {regularUpdates.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-olive-400">Earlier Updates</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {regularUpdates.slice(1).map((update) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-xl border border-olive-700/50 p-4 ${getTypeStyles(update.type).bg}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg opacity-70" aria-hidden="true">{getTypeStyles(update.type).icon}</span>
                    <div>
                      <p className="mb-0 text-cream/90">{update.message}</p>
                      <p className="mb-0 mt-1 text-sm text-olive-400">{getRelativeTime(update.created_at)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}

export default function LiveFeedPage() {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiveDay, setIsLiveDay] = useState(false);

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

  useEffect(() => {
    setIsLiveDay(isWeddingDay());
  }, []);

  // Check notification permission and subscription status.
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  // Fetch updates and set up polling.
  useEffect(() => {
    fetchUpdates();

    const interval = setInterval(fetchUpdates, 30000);
    return () => clearInterval(interval);
  }, [fetchUpdates]);

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
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
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

  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      <PageEffects variant="subtle" />

      <div className="container-wedding relative z-10 py-8 pb-24 md:py-12">
        <div className="mx-auto max-w-6xl">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-[2rem] border border-gold-500/40 bg-gradient-to-br from-black via-charcoal to-olive-900/80 p-6 shadow-elegant md:p-10"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <DayOfStatus isLive={isLiveDay} />
                <p className="mb-3 mt-7 font-accent text-3xl text-gold-500 md:text-4xl">Nate & Blake</p>
                <h1 className="mb-4 font-heading text-4xl text-cream md:text-6xl">Wedding Day Hub</h1>
                <p className="mb-0 max-w-2xl text-base leading-relaxed text-olive-200 md:text-lg">
                  Scan-friendly shortcuts for the ceremony, reception, photos, song requests, guest book messages, and live announcements — all in one place.
                </p>
              </div>

              <div className="rounded-2xl border border-olive-700 bg-black/40 p-5 text-left lg:w-72">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">Quick Details</p>
                <p className="mb-1 font-heading text-2xl text-cream">Oct. 31, 2027</p>
                <p className="mb-3 text-sm text-olive-300">Ceremony at 4:00 PM CT</p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-semibold text-black transition-colors hover:bg-gold-400"
                >
                  Open Venue Map
                </a>
              </div>
            </div>
          </motion.section>

          <div className="sticky top-20 z-20 -mx-2 mb-6 rounded-2xl border border-olive-700 bg-charcoal/95 p-2 shadow-elegant backdrop-blur md:hidden">
            <div className="grid grid-cols-3 gap-2">
              <Link href="/photos" className="rounded-xl bg-gold-500 px-3 py-3 text-center text-sm font-semibold text-black">
                Photos
              </Link>
              <Link href="/guestbook" className="rounded-xl bg-olive-800 px-3 py-3 text-center text-sm font-semibold text-cream">
                Guest Book
              </Link>
              <Link href="/songs" className="rounded-xl bg-olive-800 px-3 py-3 text-center text-sm font-semibold text-cream">
                Songs
              </Link>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {hubActions.map((action, index) => (
              <ActionCard key={action.href} action={action} index={index} />
            ))}
          </div>

          <div className="mb-6">
            <NotificationPanel
              isSubscribed={isSubscribed}
              subscribing={subscribing}
              notificationPermission={notificationPermission}
              onSubscribe={subscribeToPush}
              onUnsubscribe={unsubscribeFromPush}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:items-start">
            <TimelineCard isLive={isLiveDay} />
            <UpdatesFeed loading={loading} updates={updates} />
          </div>

          <div className="mt-6">
            <InfoGrid />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to convert VAPID key.
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
