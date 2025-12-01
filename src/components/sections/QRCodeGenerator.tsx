'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface QRCodeGeneratorProps {
  url?: string;
  title?: string;
  size?: number;
}

export function QRCodeGenerator({
  url = typeof window !== 'undefined' ? `${window.location.origin}/photos` : '/photos',
  title = 'Scan to Share Photos',
  size = 200,
}: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate QR code using a simple algorithm
    // For production, you might want to use a proper QR library
    generateQRCode(url, size);
  }, [url, size]);

  const generateQRCode = async (text: string, qrSize: number) => {
    // Use Google Charts API for QR code generation (simple approach)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(text)}&bgcolor=1a1a1a&color=d4af37`;
    setQrDataUrl(qrUrl);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'wedding-photo-booth-qr.png';
    link.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center"
    >
      <h3 className="font-heading text-xl text-cream mb-2">{title}</h3>
      <p className="text-olive-400 text-sm mb-4">
        Print this QR code for your tables so guests can easily access the photo booth!
      </p>

      {/* QR Code Display */}
      <div className="bg-charcoal p-4 rounded-lg inline-block mb-4">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Photo Booth QR Code"
            width={size}
            height={size}
            className="rounded"
          />
        ) : (
          <div
            className="bg-olive-800 animate-pulse rounded"
            style={{ width: size, height: size }}
          />
        )}
      </div>

      {/* URL Display */}
      <div className="bg-olive-900/50 rounded-lg p-3 mb-4">
        <p className="text-olive-300 text-sm break-all font-mono">{url}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={downloadQR}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-2 bg-olive-700 text-cream rounded-lg hover:bg-olive-600 transition-colors font-medium"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </>
          )}
        </button>
      </div>

      {/* Print Instructions */}
      <div className="mt-6 pt-4 border-t border-olive-700/50">
        <p className="text-olive-500 text-xs">
          💡 Tip: Print on card stock and place one on each table for easy guest access
        </p>
      </div>
    </motion.div>
  );
}
