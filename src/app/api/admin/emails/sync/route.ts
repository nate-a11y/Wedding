import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  refreshAccessToken,
  getSentEmails,
  getInboxEmails,
} from '@/lib/microsoft-graph';

interface MicrosoftAuth {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Get valid Microsoft access token
 */
async function getMicrosoftToken(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data: auth, error } = await supabase
      .from('microsoft_auth')
      .select('access_token, refresh_token, expires_at')
      .single();

    if (error || !auth) return null;

    const msAuth = auth as MicrosoftAuth;
    const expiresAt = new Date(msAuth.expires_at);

    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      try {
        const newTokens = await refreshAccessToken(msAuth.refresh_token);

        await supabase
          .from('microsoft_auth')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq('access_token', auth.access_token);

        return newTokens.access_token;
      } catch {
        return null;
      }
    }

    return msAuth.access_token;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/emails/sync
 * Sync sent emails from Microsoft to the local tracker
 */
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const token = await getMicrosoftToken();
  if (!token) {
    return NextResponse.json({ error: 'Microsoft not connected' }, { status: 401 });
  }

  try {
    // Get sent emails from the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { emails: sentEmails } = await getSentEmails(token, {
      top: 100,
      since,
    });

    // Get inbox for reply tracking
    const { emails: inboxEmails, unreadCount } = await getInboxEmails(token, {
      top: 50,
      since,
    });

    // Sync sent emails to database
    let synced = 0;
    let skipped = 0;

    for (const email of sentEmails) {
      // Check if we already have this email logged
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('microsoft_id', email.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Get recipient email
      const toAddress = email.toRecipients?.[0]?.emailAddress?.address || 'unknown';

      // Insert into emails table
      const { error } = await supabase
        .from('emails')
        .insert({
          microsoft_id: email.id,
          direction: 'outbound',
          from_address: 'nateandblakesayido@outlook.com',
          to_address: toAddress,
          subject: email.subject,
          status: 'sent',
          email_type: determineEmailType(email.subject),
          sent_at: email.sentDateTime,
          outlook_link: email.webLink,
        });

      if (!error) {
        synced++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      totalSent: sentEmails.length,
      inboxUnread: unreadCount,
      recentReplies: inboxEmails.slice(0, 10).map(e => ({
        from: e.from?.emailAddress?.address,
        subject: e.subject,
        preview: e.bodyPreview?.substring(0, 100),
        isRead: e.isRead,
      })),
    });
  } catch (error) {
    console.error('Email sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Determine email type from subject line
 */
function determineEmailType(subject: string): string {
  const subjectLower = subject.toLowerCase();

  if (subjectLower.includes('rsvp') || subjectLower.includes("can't wait to celebrate")) {
    return 'rsvp_confirmation';
  }
  if (subjectLower.includes('address') || subjectLower.includes("you're on our list")) {
    return 'address_confirmation';
  }
  if (subjectLower.includes('guestbook') || subjectLower.includes('guest book')) {
    return 'guestbook_thank_you';
  }
  if (subjectLower.includes('save the date')) {
    return 'save_the_date';
  }

  return 'bulk_announcement';
}

/**
 * POST /api/admin/emails/sync
 * Manually trigger a full sync
 */
export async function POST() {
  // Same as GET but could do more intensive sync
  return GET();
}
