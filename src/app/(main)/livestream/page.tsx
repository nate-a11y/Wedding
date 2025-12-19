'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { siteConfig } from '@/config/site';
import { PageEffects } from '@/components/ui';

// Configuration
const LIVESTREAM_CONFIG = {
  // YouTube Live video ID
  youtubeVideoId: 'F64VhoE56Ww',
  // Wedding day: October 31, 2027 at 3:30 PM Central Time
  // Stream goes live automatically at this time
  goLiveDate: new Date('2027-10-31T15:30:00-05:00'), // CDT (Central Daylight Time)
  // Stream ends and shows recording after this time (end of reception ~11 PM)
  streamEndDate: new Date('2027-10-31T23:00:00-05:00'),
};

function useStreamStatus() {
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const { goLiveDate, streamEndDate } = LIVESTREAM_CONFIG;

      if (now >= streamEndDate) {
        setStatus('ended');
      } else if (now >= goLiveDate) {
        setStatus('live');
      } else {
        setStatus('upcoming');
      }
    };

    // Check immediately
    checkStatus();

    // Check every minute
    const interval = setInterval(checkStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

export default function LivestreamPage() {
  const weddingDate = siteConfig.wedding.displayDate;
  const { youtubeVideoId } = LIVESTREAM_CONFIG;
  const hasVideoId = youtubeVideoId && youtubeVideoId.length > 0;
  const streamStatus = useStreamStatus();

  // Show the video player if live or ended (for recording)
  const showPlayer = streamStatus === 'live' || streamStatus === 'ended';

  return (
    <div className="section-padding bg-charcoal min-h-screen relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <div className="container-wedding relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.p
            className="font-accent text-3xl text-gold-500 mb-4"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {streamStatus === 'live' ? 'Now Live' : streamStatus === 'ended' ? 'Watch Recording' : 'Watch Live'}
          </motion.p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            360° Livestream
          </h1>
          <div className="relative mb-8 flex justify-center">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="h-[2px] w-48 md:w-64 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold-500"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.5, delay: 0.8 }}
            />
          </div>
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            {streamStatus === 'live'
              ? "We're live! Join us virtually with our immersive 360° livestream. Look around in any direction to feel like you're right there with us."
              : streamStatus === 'ended'
              ? "Thanks for celebrating with us! Watch the recording of our special day in immersive 360°."
              : "Can't be there in person? Join us virtually with our immersive 360° livestream. Look around in any direction to feel like you're right there with us."}
          </p>
        </motion.div>

        {/* Livestream Embed */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto mb-12"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant overflow-hidden">
            {showPlayer ? (
              hasVideoId ? (
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                    title="Nate & Blake Wedding Livestream"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-charcoal-dark">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-olive-700/50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-cream text-lg font-medium mb-2">Stream Starting Soon</p>
                    <p className="text-olive-300">The stream will appear here once we go live.</p>
                  </div>
                </div>
              )
            ) : (
              <div className="aspect-video flex items-center justify-center bg-charcoal-dark relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-gold-500 rounded-full" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border border-olive-500 rounded-full" />
                </div>

                <div className="text-center p-8 relative z-10">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-olive-700/30 border border-olive-600 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-cream text-2xl font-heading mb-3">Coming Soon</h3>
                  <p className="text-olive-300 text-lg mb-2">
                    The livestream will be available on
                  </p>
                  <p className="text-gold-500 text-xl font-medium">{weddingDate}</p>
                  <p className="text-olive-400 mt-2 text-sm">Starting at 3:30 PM Central</p>
                  <p className="text-olive-400 mt-4 text-sm">
                    Check back on the day of our wedding to watch live!
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Live indicator */}
        {streamStatus === 'live' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/50 rounded-full px-4 py-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-medium">LIVE NOW</span>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-8">
            <h2 className="font-heading text-2xl text-cream mb-6 text-center">
              How to Watch in 360°
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-olive-700/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-cream font-medium mb-2">Desktop</h3>
                <p className="text-olive-300 text-sm">
                  Click and drag anywhere on the video to look around in any direction
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-olive-700/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-cream font-medium mb-2">Phone / Tablet</h3>
                <p className="text-olive-300 text-sm">
                  Move your device around like a window into the room, or swipe to look around
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-olive-700/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-cream font-medium mb-2">VR Headset</h3>
                <p className="text-olive-300 text-sm">
                  For the full immersive experience, watch in VR mode on YouTube
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Message for remote guests */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-black/30 border border-olive-700/50 rounded-lg p-8 max-w-2xl mx-auto">
            <p className="text-olive-300 italic text-lg">
              &ldquo;Even if you can&apos;t be here in person, know that you&apos;re with us in spirit.
              Thank you for being part of our special day from wherever you are.&rdquo;
            </p>
            <p className="text-gold-500 mt-4 font-accent text-xl">
              — Nate & Blake
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
