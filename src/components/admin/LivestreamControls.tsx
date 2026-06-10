'use client';

import { useCallback, useEffect, useState } from 'react';

type StreamStatus = 'upcoming' | 'live' | 'ended';
type StatusMode = 'auto' | StreamStatus;

interface LivestreamSettings {
  id: string;
  video_id: string | null;
  status_mode: StatusMode;
  go_live_at: string | null;
  end_at: string | null;
  live_notified_at: string | null;
}

interface LivestreamState {
  status: StreamStatus;
  videoId: string | null;
  goLiveAt: string;
  endAt: string;
}

interface ActionMessage {
  success: boolean;
  message: string;
}

const STATUS_LABELS: Record<StreamStatus, string> = {
  upcoming: 'Upcoming',
  live: 'LIVE',
  ended: 'Ended',
};

const MODE_OPTIONS: { value: StatusMode; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Follows the scheduled times' },
  { value: 'upcoming', label: 'Upcoming', description: 'Force the countdown view' },
  { value: 'live', label: 'Live', description: 'Force the player on' },
  { value: 'ended', label: 'Ended', description: 'Show the recording view' },
];

function extractVideoId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|live\/|embed\/)|youtu\.be\/)([\w-]{5,20})/
  );
  return urlMatch ? urlMatch[1] : trimmed;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function LivestreamControls() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<LivestreamState | null>(null);
  const [settings, setSettings] = useState<LivestreamSettings | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  const [videoInput, setVideoInput] = useState('');
  const [mode, setMode] = useState<StatusMode>('auto');
  const [goLiveAt, setGoLiveAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/livestream');
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setState(data.state);
        setVideoInput(data.settings?.video_id ?? data.state?.videoId ?? '');
        setMode(data.settings?.status_mode ?? 'auto');
        setGoLiveAt(toDatetimeLocal(data.settings?.go_live_at ?? data.state?.goLiveAt ?? null));
        setEndAt(toDatetimeLocal(data.settings?.end_at ?? data.state?.endAt ?? null));
      }
    } catch (err) {
      console.error('Failed to load livestream settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const save = async (overrides: Record<string, unknown> = {}, successMessage = 'Livestream settings saved') => {
    setSaving(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/livestream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: extractVideoId(videoInput) || null,
          status_mode: mode,
          go_live_at: goLiveAt ? new Date(goLiveAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          ...overrides,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionMessage({ success: false, message: data.error || 'Failed to save livestream settings' });
        return;
      }

      setSettings(data.settings);
      setState(data.state);
      setMode(data.settings?.status_mode ?? 'auto');

      let message = successMessage;
      if (data.pushResult) {
        message += data.pushResult.configured
          ? ` — push sent to ${data.pushResult.sent} of ${data.pushResult.attempted} subscribers`
          : ' — push notifications are not configured';
      }
      setActionMessage({ success: true, message });
    } catch (err) {
      console.error('Livestream save failed:', err);
      setActionMessage({ success: false, message: 'Failed to save livestream settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-olive-600 bg-charcoal-light p-6">
        <div className="h-24 animate-pulse rounded-xl bg-black/30" />
      </div>
    );
  }

  const currentStatus = state?.status ?? 'upcoming';
  const alreadyNotified = Boolean(settings?.live_notified_at);

  return (
    <div className="rounded-2xl border border-olive-600 bg-charcoal-light p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-medium text-cream">Livestream</h3>
          <p className="text-sm text-olive-400">
            Control the stream on the{' '}
            <a href="/livestream" target="_blank" rel="noopener noreferrer" className="text-gold-400 underline hover:text-gold-300">
              guest livestream page
            </a>
            . Going live can push-notify subscribed guests.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
            currentStatus === 'live'
              ? 'border-red-500/50 bg-red-600/20 text-red-300'
              : currentStatus === 'ended'
                ? 'border-olive-600 bg-black/35 text-olive-300'
                : 'border-gold-500/40 bg-gold-500/10 text-gold-300'
          }`}
        >
          {currentStatus === 'live' && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {actionMessage && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            actionMessage.success
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {actionMessage.message}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-olive-200">YouTube video ID or URL</label>
          <input
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="e.g. dQw4w9WgXcQ or a youtube.com/live link"
            className="w-full rounded-xl border border-olive-600 bg-charcoal px-4 py-2.5 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-olive-200">Scheduled go-live</label>
            <input
              type="datetime-local"
              value={goLiveAt}
              onChange={(e) => setGoLiveAt(e.target.value)}
              className="w-full rounded-xl border border-olive-600 bg-charcoal px-3 py-2.5 text-cream focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-olive-200">Scheduled end</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-xl border border-olive-600 bg-charcoal px-3 py-2.5 text-cream focus:border-gold-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-3 block text-sm font-medium text-olive-200">Stream status</label>
        <div className="grid gap-3 sm:grid-cols-4">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                mode === option.value
                  ? option.value === 'live'
                    ? 'border-red-400 bg-red-500/20 text-red-100'
                    : 'border-gold-400 bg-gold-500/15 text-gold-100'
                  : 'border-olive-700 bg-black/25 text-olive-300 hover:border-olive-500'
              }`}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs opacity-80">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gold-400 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('live');
            save({ status_mode: 'live', notify: !alreadyNotified }, 'Stream is live');
          }}
          disabled={saving}
          className="rounded-xl border border-red-500/60 bg-red-600/20 px-5 py-2.5 text-sm font-medium text-red-200 transition-colors hover:bg-red-600/30 disabled:opacity-50"
        >
          🔴 Go live now{!alreadyNotified && ' + notify guests'}
        </button>
        {alreadyNotified && (
          <span className="text-xs text-olive-400">
            Go-live push already sent. Switch the stream off live to re-arm it.
          </span>
        )}
      </div>
    </div>
  );
}
