import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendEmail } from '@/lib/microsoft-graph';
import { cookies } from 'next/headers';

interface SegmentFilter {
  all?: boolean;
  tags?: string[];
  rsvp_status?: 'attending' | 'not_attending' | 'not_responded';
  event_invited?: string;
}

// Helper to get recipients based on segment
async function getRecipients(segment: SegmentFilter): Promise<Array<{ email: string; name: string }>> {
  if (!supabase) return [];

  const recipients: Array<{ email: string; name: string }> = [];

  // Start with all guests who have addresses
  const { data: addresses } = await supabase
    .from('guest_addresses')
    .select('email, name');

  if (!addresses) return [];

  // Build email -> name map
  const guestMap = new Map<string, string>();
  for (const addr of addresses) {
    guestMap.set(addr.email.toLowerCase(), addr.name);
  }

  // If "all", return everyone with an address
  if (segment.all) {
    return addresses.map(a => ({ email: a.email.toLowerCase(), name: a.name }));
  }

  let eligibleEmails = new Set(addresses.map(a => a.email.toLowerCase()));

  // Filter by tags
  if (segment.tags && segment.tags.length > 0) {
    const { data: tagged } = await supabase
      .from('guest_tags')
      .select('email')
      .in('tag', segment.tags);

    const taggedEmails = new Set((tagged || []).map(t => t.email.toLowerCase()));
    eligibleEmails = new Set([...eligibleEmails].filter(e => taggedEmails.has(e)));
  }

  // Filter by RSVP status
  if (segment.rsvp_status) {
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('email, attending');

    const rsvpEmails = new Map((rsvps || []).map(r => [r.email.toLowerCase(), r.attending]));

    if (segment.rsvp_status === 'attending') {
      eligibleEmails = new Set([...eligibleEmails].filter(e => rsvpEmails.get(e) === true));
    } else if (segment.rsvp_status === 'not_attending') {
      eligibleEmails = new Set([...eligibleEmails].filter(e => rsvpEmails.get(e) === false));
    } else if (segment.rsvp_status === 'not_responded') {
      eligibleEmails = new Set([...eligibleEmails].filter(e => !rsvpEmails.has(e)));
    }
  }

  // Filter by event invitation
  if (segment.event_invited) {
    const { data: invited } = await supabase
      .from('guest_events')
      .select('email')
      .eq('event_slug', segment.event_invited);

    const invitedEmails = new Set((invited || []).map(i => i.email.toLowerCase()));
    eligibleEmails = new Set([...eligibleEmails].filter(e => invitedEmails.has(e)));
  }

  // Build final recipient list
  for (const email of eligibleEmails) {
    recipients.push({
      email,
      name: guestMap.get(email) || 'Guest',
    });
  }

  return recipients;
}

// POST /api/admin/campaigns/[id]/send - Send or schedule campaign
export async function POST(
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
    const body = await request.json();
    const { schedule_for } = body;

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      );
    }

    // If scheduling for later
    if (schedule_for) {
      await supabase
        .from('email_campaigns')
        .update({
          status: 'scheduled',
          scheduled_for: schedule_for,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: `Campaign scheduled for ${schedule_for}`,
      });
    }

    // Get Microsoft tokens
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('microsoft_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Microsoft account not connected. Please connect your Outlook account first.' },
        { status: 401 }
      );
    }

    // Get recipients
    const recipients = await getRecipients(campaign.segment as SegmentFilter);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients match the campaign segment' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', id);

    // Create email_sends records
    const sendRecords = recipients.map(r => ({
      campaign_id: id,
      email: r.email,
      guest_name: r.name,
      status: 'pending',
    }));

    await supabase
      .from('email_sends')
      .insert(sendRecords);

    // Send emails
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        // Personalize email content
        const personalizedHtml = campaign.body_html
          .replace(/\{\{name\}\}/g, recipient.name)
          .replace(/\{\{email\}\}/g, recipient.email);

        await sendEmail(accessToken, {
          to: [recipient.email],
          subject: campaign.subject,
          html: personalizedHtml,
        });

        // Update send record
        await supabase
          .from('email_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('campaign_id', id)
          .eq('email', recipient.email);

        successCount++;

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Update send record with error
        await supabase
          .from('email_sends')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('campaign_id', id)
          .eq('email', recipient.email);

        failCount++;
      }
    }

    // Update campaign status to sent
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Campaign sent: ${successCount} succeeded, ${failCount} failed`,
      stats: {
        total: recipients.length,
        sent: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('Campaign send error:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
