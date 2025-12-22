import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/campaigns/[id] - Get campaign details with send stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError) throw campaignError;

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get send details
    const { data: sends, error: sendsError } = await supabase
      .from('email_sends')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (sendsError) throw sendsError;

    // Calculate stats
    const stats = {
      total: sends?.length || 0,
      pending: sends?.filter(s => s.status === 'pending').length || 0,
      sent: sends?.filter(s => s.status === 'sent').length || 0,
      delivered: sends?.filter(s => s.status === 'delivered').length || 0,
      failed: sends?.filter(s => s.status === 'failed').length || 0,
      opened: sends?.filter(s => s.status === 'opened').length || 0,
    };

    return NextResponse.json({
      campaign,
      sends: sends || [],
      stats,
    });
  } catch (error) {
    console.error('Admin campaign fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
