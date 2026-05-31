import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import {
  createVendorPortalToken,
  getVendorTokenPreview,
  getVendorTokenStorageValue,
  hashVendorPortalToken,
} from '@/lib/vendor-token';

// POST /api/vendor/token - Generate a magic link token for a vendor
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { vendor_id, vendor_name, role, expires_hours = 168 } = await request.json();

    if (!vendor_name || !role) {
      return NextResponse.json(
        { error: 'Vendor name and role are required' },
        { status: 400 }
      );
    }

    // Generate a high-entropy token. Only the hash is stored; the raw token is
    // returned once so the admin can copy/share the magic link at creation time.
    const token = createVendorPortalToken();
    const tokenHash = hashVendorPortalToken(token);
    const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('vendor_portal_tokens')
      .insert({
        token: getVendorTokenStorageValue(tokenHash),
        token_hash: tokenHash,
        token_preview: getVendorTokenPreview(token),
        vendor_id: vendor_id || null,
        vendor_name,
        role,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, vendor_id, vendor_name, role, expires_at, token_preview, last_accessed, last_used_at, access_count, revoked_at, created_at')
      .single();

    if (error) throw error;

    const defaultChecklist = [
      { label: 'Confirm arrival window', details: 'Review the timeline and arrival/load-in cues.', sort_order: 10 },
      { label: 'Review venue logistics', details: 'Check parking, load-in, and venue map before arrival.', sort_order: 20 },
      { label: 'Confirm day-of contact', details: 'Use the portal contact action if anything changes.', sort_order: 30 },
      { label: 'Mark setup complete', details: 'Complete once your station/setup is wedding-ready.', sort_order: 40 },
    ];

    const { error: checklistError } = await supabase
      .from('vendor_checklist_items')
      .insert(defaultChecklist.map((item) => ({
        ...item,
        vendor_token_id: data.id,
        vendor_id: vendor_id || null,
      })));

    if (checklistError) {
      console.warn('Vendor checklist seed failed:', checklistError.message);
    }

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    return NextResponse.json({
      success: true,
      token,
      link: `${baseUrl}/vendor/${token}`,
      expires_at: data.expires_at,
      token_record: data,
    });
  } catch (error) {
    console.error('Generate vendor token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate vendor token' },
      { status: 500 }
    );
  }
}

// GET /api/vendor/token - List all active vendor tokens without exposing raw tokens
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ tokens: [] });
  }

  try {
    const { data: tokens, error } = await supabase
      .from('vendor_portal_tokens')
      .select('id, vendor_id, vendor_name, role, expires_at, token_preview, last_accessed, last_used_at, access_count, revoked_at, revoked_by, revoked_reason, created_at')
      .gte('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tokens: tokens || [] });
  } catch (error) {
    console.error('List vendor tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to list vendor tokens' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendor/token - Revoke a vendor token
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { token_id, reason } = await request.json();

    if (!token_id) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('vendor_portal_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: 'admin',
        revoked_reason: reason || 'manual_revoke',
      })
      .eq('id', token_id)
      .is('revoked_at', null);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke vendor token error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}
