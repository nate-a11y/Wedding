import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { validateVendorPortalToken } from '@/lib/vendor-portal-access';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { token } = await params;
    const tokenData = await validateVendorPortalToken(token, false);
    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';
    const checkedInAt = tokenData.checked_in_at || new Date().toISOString();

    const { data, error } = await supabase
      .from('vendor_portal_tokens')
      .update({
        checked_in_at: checkedInAt,
        check_in_note: note || tokenData.check_in_note || null,
        last_accessed: new Date().toISOString(),
      })
      .eq('id', tokenData.id)
      .select('checked_in_at, check_in_note')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, checkedInAt: data.checked_in_at, checkInNote: data.check_in_note });
  } catch (error) {
    console.error('Vendor check-in error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check in' },
      { status: 401 }
    );
  }
}
