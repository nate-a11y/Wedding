'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Input } from './Input';
import type { AddressSuggestion, SuggestedAddress } from '@/lib/address-autocomplete';

export function AddressAutocomplete({ value, country, name, onChange, onSelect }: {
  value: string;
  country: string;
  name: string;
  onChange: (value: string) => void;
  onSelect: (address: SuggestedAddress) => void;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('');
  const [resolving, setResolving] = useState(false);
  const session = useRef('');
  const selected = useRef('');
  const version = useRef(0);
  const detailsRequest = useRef<AbortController | null>(null);
  const countryCode = country === 'United States' ? 'US' : country === 'Canada' ? 'CA' : null;

  useEffect(() => () => detailsRequest.current?.abort(), []);

  useEffect(() => {
    ++version.current;
    selected.current = '';
    session.current = '';
    detailsRequest.current?.abort();
  }, [country]);

  useEffect(() => {
    const current = ++version.current;
    setSuggestions([]);
    setActive(-1);
    setStatus('');
    if (!focused || !countryCode || value.trim().length < 3 || value === selected.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      session.current ||= crypto.randomUUID();
      setStatus('Finding addresses…');
      try {
        const response = await fetch('/api/address/autocomplete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ action: 'suggest', input: value.trim(), sessionToken: session.current, country: countryCode }),
        });
        if (!response.ok) throw new Error('Suggestions unavailable');
        const data: { suggestions: AddressSuggestion[] } = await response.json();
        if (controller.signal.aborted || current !== version.current) return;
        setSuggestions(data.suggestions);
        setStatus(data.suggestions.length ? `${data.suggestions.length} suggestions available. Use the arrow keys to choose.` : 'No suggestions found. You can enter your address manually.');
      } catch {
        if (!controller.signal.aborted && current === version.current) setStatus('Suggestions unavailable. You can enter your address manually.');
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, countryCode, focused]);

  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);

  async function choose(suggestion: AddressSuggestion) {
    const current = ++version.current;
    detailsRequest.current?.abort();
    const controller = new AbortController();
    detailsRequest.current = controller;
    setSuggestions([]);
    setActive(-1);
    setResolving(true);
    setStatus('Filling address…');
    try {
      const response = await fetch('/api/address/autocomplete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        body: JSON.stringify({ action: 'resolve', placeId: suggestion.placeId, sessionToken: session.current, country: countryCode }),
      });
      if (!response.ok) throw new Error('Address unavailable');
      const data: { address: SuggestedAddress } = await response.json();
      if (current !== version.current) return;
      selected.current = data.address.street_address;
      onSelect(data.address);
      setStatus('Address filled. Check the details and add your apartment or unit if needed.');
    } catch {
      if (!controller.signal.aborted && current === version.current) setStatus('Could not fill this address. Please enter it manually.');
    } finally {
      session.current = '';
      setResolving(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id={`${id}-input`} label="Street Address" name={name} value={value} required
        autoComplete="off" placeholder={countryCode ? 'Start typing your street address' : 'Street address'}
        role="combobox" aria-autocomplete="list" aria-expanded={focused && suggestions.length > 0}
        aria-controls={focused && suggestions.length > 0 ? `${id}-list` : undefined}
        aria-activedescendant={focused && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-describedby={`${id}-status`} aria-busy={resolving}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); detailsRequest.current?.abort(); }}
        onChange={event => {
          ++version.current;
          selected.current = '';
          detailsRequest.current?.abort();
          onChange(event.target.value);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') { ++version.current; setSuggestions([]); setActive(-1); detailsRequest.current?.abort(); }
          if (!suggestions.length) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(index => (index + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1) + suggestions.length) % suggestions.length);
          } else if (event.key === 'Enter' && active >= 0) {
            event.preventDefault();
            void choose(suggestions[active]);
          }
        }}
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-olive-600 bg-charcoal shadow-elegant">
          <ul id={`${id}-list`} role="listbox" aria-label="Address suggestions" className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} role="presentation">
                <button
                  type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} aria-selected={active === index}
                  className={`min-h-11 w-full px-3 py-3 text-left text-sm text-cream ${active === index ? 'bg-olive-700' : 'hover:bg-olive-800'}`}
                  onMouseDown={event => event.preventDefault()} onClick={() => void choose(suggestion)}
                >{suggestion.text}</button>
              </li>
            ))}
          </ul>
          <p className="border-t border-olive-700 px-3 py-2 text-xs text-cream">Google Maps</p>
        </div>
      )}
      <p id={`${id}-status`} role="status" className="mt-1 text-xs text-olive-300">{status}</p>
    </div>
  );
}
