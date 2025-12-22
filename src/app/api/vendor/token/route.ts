import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { randomBytes } from 'crypto';

// POST /api/vendor/token - Generate a magic link token for a vendor
export async function POST(request: NextRequest) {
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

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000);

    // Store token in database
    const { data, error } = await supabase
      .from('vendor_portal_tokens')
      .insert({
        token,
        vendor_id: vendor_id || null,
        vendor_name,
        role,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    return NextResponse.json({
      success: true,
      token: data.token,
      link: `${baseUrl}/vendor/${data.token}`,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('Generate vendor token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate vendor token' },
      { status: 500 }
    );
  }
}

// GET /api/vendor/token - List all active vendor tokens
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ tokens: [] });
  }

  try {
    const { data: tokens, error } = await supabase
      .from('vendor_portal_tokens')
      .select('id, token, vendor_id, vendor_name, role, expires_at, last_accessed, created_at')
      .gte('expires_at', new Date().toISOString())
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
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { token_id } = await request.json();

    if (!token_id) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('vendor_portal_tokens')
      .delete()
      .eq('id', token_id);

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
