'use client';

import { useId, useRef, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { FULL_NAME_PATTERN } from '@/lib/name-validation';
import type { GuestAddress } from '@/types/guest-address';

const fields = [
  ['name', 'Full name', 120],
  ['email', 'Email', 254],
  ['phone', 'Phone (optional)', 50],
  ['street_address', 'Street address', 150],
  ['street_address_2', 'Apartment / unit (optional)', 150],
  ['city', 'City', 100],
  ['state', 'State / province', 80],
  ['postal_code', 'ZIP / postal code', 20],
  ['country', 'Country', 100],
] as const;

type Fields = Record<typeof fields[number][0], string>;

function initialFields(address?: GuestAddress): Fields {
  return Object.fromEntries(fields.map(([key]) => [key, address?.[key] ?? (key === 'country' ? 'United States' : '')])) as Fields;
}

export function AddressEditor({ address, onSaved }: {
  address?: GuestAddress;
  onSaved: (address: GuestAddress) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [values, setValues] = useState(() => initialFields(address));
  const [version, setVersion] = useState(address?.updated_at ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/addresses', {
        method: address ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ...(address ? { id: address.id, updated_at: version } : {}) }),
      });
      const result = await response.json();
      if (!response.ok || !result.address) {
        throw new Error(result.details?.map((detail: { message: string }) => detail.message).join('. ') || result.error || 'Unable to save address.');
      }
      onSaved(result.address);
      dialog.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Button size="sm" variant={address ? 'ghost' : 'primary'} aria-label={address ? `Edit address for ${address.name}` : 'Add address'} onClick={() => {
      setValues(initialFields(address));
      setVersion(address?.updated_at ?? null);
      setError('');
      dialog.current?.showModal();
    }}>{address ? 'Edit' : 'Add address'}</Button>
    <dialog ref={dialog} aria-labelledby={titleId} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-olive-600 bg-charcoal p-5 text-cream shadow-elegant backdrop:bg-black/75" onCancel={event => { if (saving) event.preventDefault(); }}>
      <h2 id={titleId} className="mb-2 font-heading text-2xl">{address ? 'Edit address' : 'Add address'}</h2>
      <p className="mb-5 text-sm text-olive-300">Saves contact and mailing details only. No email is sent. RSVPs and private-event invitations stay unchanged.</p>
      {address && values.email.trim().toLowerCase() !== address.email.toLowerCase() && <p className="mb-4 text-sm text-gold-400">Tags and invitations belong to an email address. Changing this email does not transfer them or update the linked RSVP.</p>}
      <form onSubmit={save} className="space-y-4">
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label, maxLength]) => <Input key={key} id={`${titleId}-${key}`} label={label} maxLength={maxLength}
            type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
            pattern={key === 'name' ? FULL_NAME_PATTERN : undefined}
            required={key === 'state' ? ['united states', 'canada'].includes(values.country.trim().toLowerCase()) : !['phone', 'street_address_2'].includes(key)}
            value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />)}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" disabled={saving} onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</Button>
        </div>
      </form>
    </dialog>
  </>;
}
