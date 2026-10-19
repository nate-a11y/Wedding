'use client';

import Link from 'next/link';
import { Button } from './Button';

export function AddressValidationNotice({ unavailable, onContinue }: {
  unavailable?: boolean;
  onContinue?: () => void;
}) {
  return (
    <div className="space-y-3 text-sm text-olive-300">
      {unavailable && (
        <div role="status" className="rounded-lg border border-gold-500/40 p-3">
          <p>Address validation is unavailable. Double-check your address before continuing without verification.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={onContinue}>
            Continue without verification
          </Button>
        </div>
      )}
      <p className="text-xs">
        Address validation by <span className="font-normal text-cream">Google Maps</span>.{' '}
        Your US mailing address is shared with Google for validation.{' '}
        <Link href="/privacy" className="underline">Privacy &amp; terms</Link>.
      </p>
    </div>
  );
}
