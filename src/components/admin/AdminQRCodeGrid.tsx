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

  const handlePrintKit = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Unable to open print window. Please allow pop-ups for this site.');
      return;
    }

    const cards = QR_LINKS.map((item) => {
      const fullUrl = `${mainSiteUrl}${item.path}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(fullUrl)}&bgcolor=1a1a1a&color=d4af37`;
      return `
        <section class="card">
          <div class="eyebrow">Nate & Blake · 10.31.27</div>
          <h2>${item.name}</h2>
          <p>${item.description}</p>
          <img src="${qrUrl}" alt="QR code for ${item.name}" />
          <div class="path">${item.path}</div>
        </section>
      `;
    }).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Nate & Blake QR Signage Kit</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0.35in;
              background: #11130f;
              color: #faf9f6;
              font-family: Georgia, 'Times New Roman', serif;
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0.25in;
            }
            .card {
              min-height: 4.75in;
              break-inside: avoid;
              page-break-inside: avoid;
              border: 2px solid #d4af37;
              border-radius: 24px;
              padding: 0.28in;
              text-align: center;
              background:
                radial-gradient(circle at top left, rgba(212, 175, 55, 0.18), transparent 35%),
                linear-gradient(145deg, #050505, #1c2117);
            }
            .eyebrow {
              color: #d4af37;
              text-transform: uppercase;
              letter-spacing: 0.16em;
              font: 700 10px Arial, sans-serif;
            }
            h1 { color: #d4af37; text-align: center; margin: 0 0 0.25in; }
            h2 { font-size: 32px; margin: 0.14in 0 0.08in; }
            p { color: #c7d2bd; font: 15px Arial, sans-serif; margin: 0 0 0.2in; }
            img {
              width: 2.4in;
              height: 2.4in;
              border-radius: 14px;
              border: 10px solid #faf9f6;
              background: #faf9f6;
            }
            .path {
              display: inline-block;
              margin-top: 0.18in;
              padding: 0.08in 0.16in;
              border: 1px solid rgba(212, 175, 55, 0.6);
              border-radius: 999px;
              color: #faf9f6;
              font: 700 16px Arial, sans-serif;
            }
            @media print {
              body { background: #11130f; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>Nate & Blake QR Signage Kit</h1>
          <main class="sheet">${cards}</main>
          <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">Print kit</p>
            <h3 className="mt-1 font-heading text-2xl text-cream">QR signage in one click</h3>
            <p className="mt-1 text-sm text-olive-300">
              Generates a printable two-up signage sheet for table cards, bar signs, and welcome displays.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrintKit}
            className="rounded-xl bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-400"
          >
            Print signage kit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
