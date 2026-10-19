import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { mergeEmailSendHistory } from '@/lib/email-send-history';

// GET /api/admin/email-sends - Get recent email sends
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const [campaignSends, emails] = await Promise.all([
      supabase.from('email_sends').select('*')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('emails')
        .select('id, related_id, to_address, status, sent_at, created_at')
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false }).limit(100),
    ]);
    if (campaignSends.error) throw campaignSends.error;
    if (emails.error) throw emails.error;

    return NextResponse.json({
      sends: mergeEmailSendHistory(campaignSends.data || [], emails.data || []),
    });
  } catch (error) {
    console.error('Email sends fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email sends' },
      { status: 500 }
    );
  }
}
