'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

const QR_LINKS = [
  { name: 'RSVP', path: '/rsvp', description: 'For guests to RSVP' },
  { name: 'Address Collection', path: '/address', description: 'Collect mailing addresses' },
  { name: 'Photo Booth', path: '/photos', description: 'Upload & view photos' },
  { name: 'Song Requests', path: '/songs', description: 'Request songs for the playlist' },
  { name: 'Guest Book', path: '/guestbook', description: 'Leave messages for the couple' },
  { name: 'Live Feed', path: '/live', description: 'View live updates' },
  { name: 'Livestream', path: '/livestream', description: 'Watch the ceremony live' },
  { name: 'Events', path: '/events', description: 'View event schedule' },
  { name: 'Travel Info', path: '/travel', description: 'Accommodations & directions' },
  { name: 'Dress Code', path: '/dress-code', description: 'What to wear' },
  { name: 'Registry', path: '/registry', description: 'Gift registry' },
  { name: 'FAQ', path: '/faq', description: 'Frequently asked questions' },
] as const;

function getMainSiteUrl() {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname.replace(/^admin\./, '');
  const { protocol, port } = window.location;
  if (port && port !== '80' && port !== '443') {
    return `${protocol}//${hostname}:${port}`;
  }
  return `${protocol}//${hostname}`;
}

export default function AdminQRCodeGrid() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const mainSiteUrl = useMemo(() => getMainSiteUrl(), []);

  const handleCopy = (path: string, url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedPath(path);
    window.setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {QR_LINKS.map((item) => {
        const fullUrl = `${mainSiteUrl}${item.path}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&bgcolor=1a1a1a&color=d4af37`;
        const isCopied = copiedPath === item.path;

        return (
          <div key={item.path} className="bg-black/50 border border-olive-700 rounded-lg p-4">
            <div className="text-center mb-3">
              <h3 className="font-heading text-lg text-cream">{item.name}</h3>
              <p className="text-olive-500 text-xs">{item.description}</p>
            </div>

            <div className="bg-charcoal p-3 rounded-lg flex justify-center mb-3">
              <Image
                src={qrUrl}
                alt={`QR Code for ${item.name}`}
                width={150}
                height={150}
                className="rounded"
                unoptimized
              />
            </div>

            <div className="bg-olive-900/50 rounded p-2 mb-3">
              <p className="text-olive-300 text-xs break-all font-mono text-center">{fullUrl}</p>
            </div>

            <div className="flex gap-2">
              <a
                href={qrUrl}
                download={`qr-${item.path.replace('/', '')}.png`}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gold-500 rounded hover:bg-gold-400 transition-colors text-sm font-medium"
                style={{ color: '#000000' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <button
                type="button"
                onClick={() => handleCopy(item.path, fullUrl)}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded transition-colors text-sm font-medium ${
                  isCopied
                    ? 'bg-green-600 text-white'
                    : 'bg-olive-700 text-cream hover:bg-olive-600'
                }`}
              >
                {isCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
