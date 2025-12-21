'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function PWAManifest() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const manifestUrl = isAdmin ? '/admin-manifest.json' : '/manifest.json';

  useEffect(() => {
    // Remove any existing manifest links
    const existingManifests = document.querySelectorAll('link[rel="manifest"]');
    existingManifests.forEach(link => link.remove());

    // Add the correct manifest
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [manifestUrl]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
