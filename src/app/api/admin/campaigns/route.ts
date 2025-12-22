import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) throw error;

    // Get send stats for each campaign
    const campaignIds = campaigns?.map(c => c.id) || [];
    const sendStats: Record<string, { total: number; sent: number; failed: number }> = {};

    if (campaignIds.length > 0) {
      const { data: sends } = await supabase
        .from('email_sends')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);

      for (const send of sends || []) {
        if (!sendStats[send.campaign_id]) {
          sendStats[send.campaign_id] = { total: 0, sent: 0, failed: 0 };
        }
        sendStats[send.campaign_id].total++;
        if (send.status === 'sent' || send.status === 'delivered') {
          sendStats[send.campaign_id].sent++;
        } else if (send.status === 'failed') {
          sendStats[send.campaign_id].failed++;
        }
      }
    }

    const campaignsWithStats = campaigns?.map(c => ({
      ...c,
      stats: sendStats[c.id] || { total: 0, sent: 0, failed: 0 },
    }));

    return NextResponse.json({ campaigns: campaignsWithStats || [] });
  } catch (error) {
    console.error('Admin campaigns fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/admin/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const { name, type, subject, body_html, body_text, segment, scheduled_for, created_by } = body;

    if (!name || !type || !subject || !body_html) {
      return NextResponse.json(
        { error: 'Name, type, subject, and body_html are required' },
        { status: 400 }
      );
    }

    const campaignData = {
      name,
      type,
      subject,
      body_html,
      body_text: body_text || null,
      segment: segment || { all: true },
      status: scheduled_for ? 'scheduled' : 'draft',
      scheduled_for: scheduled_for || null,
      created_by: created_by || null,
    };

    const { data, error } = await supabase
      .from('email_campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error('Admin campaign create error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/campaigns - Update campaign
export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Don't allow updating sent campaigns
    const { data: existing } = await supabase
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (existing?.status === 'sent' || existing?.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot update a campaign that has already been sent' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      campaign: data,
    });
  } catch (error) {
    console.error('Admin campaign update error:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/campaigns - Delete campaign
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin campaign delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
