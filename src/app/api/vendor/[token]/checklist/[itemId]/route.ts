import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { validateVendorPortalToken } from '@/lib/vendor-portal-access';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { token, itemId } = await params;
    const tokenData = await validateVendorPortalToken(token, false);
    const body = await request.json().catch(() => ({}));
    const completed = Boolean(body?.completed);

    const { data, error } = await supabase
      .from('vendor_checklist_items')
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq('id', itemId)
      .eq('vendor_token_id', tokenData.id)
      .select('id, label, details, completed_at, sort_order')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Vendor checklist update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist' },
      { status: 401 }
    );
  }
}
