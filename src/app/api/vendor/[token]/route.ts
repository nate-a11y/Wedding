import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { siteConfig } from '@/config/site';
import {
  getVendorTokenPreview,
  getVendorTokenStorageValue,
  hashVendorPortalToken,
  isLikelyVendorPortalToken,
} from '@/lib/vendor-token';

type VendorPortalTokenRow = {
  id: string;
  token?: string | null;
  token_hash?: string | null;
  token_preview?: string | null;
  vendor_id: string | null;
  vendor_name: string;
  role: string;
  expires_at: string;
  last_accessed?: string | null;
  last_used_at?: string | null;
  access_count?: number | null;
  revoked_at?: string | null;
};

async function findVendorToken(rawToken: string): Promise<{ tokenData: VendorPortalTokenRow | null; legacyPlaintext: boolean }> {
  if (!supabase) return { tokenData: null, legacyPlaintext: false };

  const tokenHash = hashVendorPortalToken(rawToken);

  const { data: hashedToken, error: hashedError } = await supabase
    .from('vendor_portal_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (hashedError) throw hashedError;
  if (hashedToken) {
    return { tokenData: hashedToken as VendorPortalTokenRow, legacyPlaintext: false };
  }

  // Legacy fallback for rows created before token_hash existed. On successful
  // use, the row is upgraded below so plaintext is removed from the token column.
  const { data: legacyToken, error: legacyError } = await supabase
    .from('vendor_portal_tokens')
    .select('*')
    .eq('token', rawToken)
    .maybeSingle();

  if (legacyError) throw legacyError;
  return {
    tokenData: legacyToken as VendorPortalTokenRow | null,
    legacyPlaintext: Boolean(legacyToken),
  };
}

// GET /api/vendor/[token] - Validate token and return vendor portal data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { token } = await params;

    if (!isLikelyVendorPortalToken(token)) {
      return NextResponse.json(
        { error: 'Invalid or expired access link' },
        { status: 401 }
      );
    }

    const { tokenData, legacyPlaintext } = await findVendorToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired access link' },
        { status: 401 }
      );
    }

    if (tokenData.revoked_at) {
      return NextResponse.json(
        { error: 'Access link has been revoked' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access link has expired' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();
    const tokenHash = hashVendorPortalToken(token);
    const accessCount = typeof tokenData.access_count === 'number' ? tokenData.access_count + 1 : 1;

    // Update last-used metadata. Legacy plaintext rows are opportunistically
    // upgraded so the database no longer stores the raw portal token.
    const updatePayload: Record<string, string | number | null> = {
      last_accessed: now,
      last_used_at: now,
      access_count: accessCount,
    };

    if (legacyPlaintext) {
      updatePayload.token_hash = tokenHash;
      updatePayload.token = getVendorTokenStorageValue(tokenHash);
      updatePayload.token_preview = getVendorTokenPreview(token);
      updatePayload.legacy_plaintext_migrated_at = now;
    }

    const { error: updateError } = await supabase
      .from('vendor_portal_tokens')
      .update(updatePayload)
      .eq('id', tokenData.id);

    if (updateError) throw updateError;

    // Fetch timeline events
    const { data: timeline, error: timelineError } = await supabase
      .from('timeline_events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        duration_minutes,
        location,
        location_notes,
        responsible_person,
        participants,
        category,
        is_milestone,
        color,
        notes,
        staff_notes,
        vendor_id
      `)
      .order('start_time', { ascending: true });

    if (timelineError) throw timelineError;

    // Optionally filter timeline for specific vendor role
    let filteredTimeline = timeline || [];

    // If vendor has a linked vendor_id, show events where they're assigned
    // Otherwise show all events (for coordinators/DJs/general staff)
    if (tokenData.vendor_id) {
      filteredTimeline = filteredTimeline.filter(
        (event) => event.vendor_id === tokenData.vendor_id || !event.vendor_id
      );
    }

    // Get venue info from site config
    const venue = siteConfig.wedding.venue.ceremony;
    const venueInfo = {
      name: venue.name,
      address: `${venue.address}, ${venue.city}, ${venue.state} ${venue.zip}`,
      website: venue.website,
      // Vendor-specific info (can be customized)
      contactName: 'Venue Coordinator',
      contactPhone: '',
      contactEmail: '',
      parkingNotes: 'Vendor parking available. Please check with the venue coordinator.',
      loadInNotes: 'Please coordinate load-in times with the venue.',
      wifiNetwork: '',
      wifiPassword: '',
      notes: '',
    };

    // Wedding date and basic info from site config
    const weddingInfo = {
      date: '2027-10-31',
      displayDate: siteConfig.wedding.displayDate,
      coupleName: `${siteConfig.couple.person1.firstName} & ${siteConfig.couple.person2.firstName}`,
      contactEmail: siteConfig.contact.email,
    };

    return NextResponse.json({
      vendor: {
        name: tokenData.vendor_name,
        role: tokenData.role,
      },
      timeline: filteredTimeline,
      venue: venueInfo,
      wedding: weddingInfo,
    });
  } catch (error) {
    console.error('Vendor portal fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load vendor portal' },
      { status: 500 }
    );
  }
}
