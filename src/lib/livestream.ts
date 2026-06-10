import { supabase } from '@/lib/supabase-server';

export type LivestreamStatus = 'upcoming' | 'live' | 'ended';
export type LivestreamStatusMode = 'auto' | LivestreamStatus;

export interface LivestreamSettingsRow {
  id: string;
  video_id: string | null;
  status_mode: LivestreamStatusMode;
  go_live_at: string | null;
  end_at: string | null;
  live_notified_at: string | null;
  updated_at: string;
}

// Defaults used until settings are saved in the database.
export const LIVESTREAM_DEFAULTS = {
  videoId: 'F64VhoE56Ww',
  goLiveAt: '2027-10-31T15:30:00-05:00',
  endAt: '2027-10-31T23:00:00-05:00',
};

export function computeLivestreamStatus(
  settings: Pick<LivestreamSettingsRow, 'status_mode' | 'go_live_at' | 'end_at'> | null,
  now = new Date()
): LivestreamStatus {
  if (settings && settings.status_mode !== 'auto') {
    return settings.status_mode;
  }

  const goLiveAt = new Date(settings?.go_live_at || LIVESTREAM_DEFAULTS.goLiveAt);
  const endAt = new Date(settings?.end_at || LIVESTREAM_DEFAULTS.endAt);

  if (now >= endAt) return 'ended';
  if (now >= goLiveAt) return 'live';
  return 'upcoming';
}

export async function getLivestreamSettings(): Promise<LivestreamSettingsRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('livestream_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Livestream settings fetch error:', error);
    return null;
  }

  return (data as LivestreamSettingsRow | null) ?? null;
}

export function serializeLivestreamState(settings: LivestreamSettingsRow | null) {
  return {
    status: computeLivestreamStatus(settings),
    videoId: settings?.video_id ?? LIVESTREAM_DEFAULTS.videoId,
    goLiveAt: settings?.go_live_at ?? LIVESTREAM_DEFAULTS.goLiveAt,
    endAt: settings?.end_at ?? LIVESTREAM_DEFAULTS.endAt,
  };
}
