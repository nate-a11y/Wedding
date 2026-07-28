'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'safari-ios' | 'safari-mac' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
  const isMac = /Macintosh/.test(ua);

  if (isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) {
    return 'safari-ios';
  }
  if (isMac && /Safari/.test(ua) && !/Chrome|Firefox|Edg/.test(ua)) {
    return 'safari-mac';
  }
  if (/SamsungBrowser/.test(ua)) {
    return 'samsung';
  }
  if (/Edg/.test(ua)) {
    return 'edge';
  }
  if (/Chrome/.test(ua)) {
    return 'chrome';
  }
  if (/Firefox/.test(ua)) {
    return 'firefox';
  }
  return 'other';
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [browser, setBrowser] = useState<BrowserType>('other');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) return;
    }

    // Detect browser
    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);

    // For Safari (no beforeinstallprompt), show manual instructions after a delay
    if (detectedBrowser === 'safari-ios' || detectedBrowser === 'safari-mac' || detectedBrowser === 'firefox') {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Chrome/Edge/Samsung, capture the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Trigger the native install prompt
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  // Don't render if already installed
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="bg-charcoal border border-gold-500/50 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gold-500/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎃</span>
                <span className="font-heading text-gold-400">Install Our App</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-olive-400 hover:text-cream p-1"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-cream text-sm mb-4">
                Add our wedding app to your home screen for quick access and to receive wedding day notifications!
              </p>

              {deferredPrompt ? (
                // Native install button (Chrome/Edge/Samsung on Android/Desktop)
                <button
                  onClick={handleInstall}
                  className="w-full py-3 bg-gold-500 text-black rounded-lg font-medium
                           hover:bg-gold-400 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App
                </button>
              ) : (
                // Browser-specific instructions
                <div className="space-y-3">
                  {browser === 'safari-ios' && (
                    <>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">1</span>
                        <p className="text-olive-300">
                          Tap the <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-olive-700 rounded text-cream">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                              <rect x="4" y="17" width="16" height="2" rx="1" fill="currentColor" stroke="none"/>
                            </svg>
                          </span> Share button at the bottom of Safari
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">2</span>
                        <p className="text-olive-300">
                          Scroll down and tap <span className="font-medium text-cream">&ldquo;Add to Home Screen&rdquo;</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">3</span>
                        <p className="text-olive-300">
                          Tap <span className="font-medium text-cream">&ldquo;Add&rdquo;</span> in the top right
                        </p>
                      </div>
                    </>
                  )}

                  {browser === 'safari-mac' && (
                    <>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">1</span>
                        <p className="text-olive-300">
                          Click <span className="font-medium text-cream">File</span> in the menu bar
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">2</span>
                        <p className="text-olive-300">
                          Select <span className="font-medium text-cream">&ldquo;Add to Dock&rdquo;</span>
                        </p>
                      </div>
                    </>
                  )}

                  {browser === 'chrome' && (
                    <>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">1</span>
                        <p className="text-olive-300">
                          Click the <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-olive-700 rounded text-cream">⋮</span> menu in the top right
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">2</span>
                        <p className="text-olive-300">
                          Select <span className="font-medium text-cream">&ldquo;Install app&rdquo;</span> or <span className="font-medium text-cream">&ldquo;Add to Home screen&rdquo;</span>
                        </p>
                      </div>
                    </>
                  )}

                  {browser === 'edge' && (
                    <>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">1</span>
                        <p className="text-olive-300">
                          Click the <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-olive-700 rounded text-cream">⋯</span> menu in the top right
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">2</span>
                        <p className="text-olive-300">
                          Select <span className="font-medium text-cream">&ldquo;Apps&rdquo;</span> → <span className="font-medium text-cream">&ldquo;Install this site as an app&rdquo;</span>
                        </p>
                      </div>
                    </>
                  )}

                  {browser === 'firefox' && (
                    <p className="text-olive-400 text-sm">
                      Firefox doesn&apos;t fully support installing web apps. For the best experience with notifications, try using <span className="font-medium text-cream">Chrome</span> or <span className="font-medium text-cream">Safari</span>.
                    </p>
                  )}

                  {browser === 'samsung' && (
                    <>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">1</span>
                        <p className="text-olive-300">
                          Tap the <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-olive-700 rounded text-cream">☰</span> menu button
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <span className="bg-olive-700 rounded-full w-6 h-6 flex items-center justify-center text-cream shrink-0">2</span>
                        <p className="text-olive-300">
                          Tap <span className="font-medium text-cream">&ldquo;Add page to&rdquo;</span> → <span className="font-medium text-cream">&ldquo;Home screen&rdquo;</span>
                        </p>
                      </div>
                    </>
                  )}

                  {browser === 'other' && (
                    <p className="text-olive-400 text-sm">
                      Use your browser&apos;s menu to find &ldquo;Add to Home Screen&rdquo; or &ldquo;Install App&rdquo;.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
