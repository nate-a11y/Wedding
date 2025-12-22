import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendEmail } from '@/lib/microsoft-graph';
import { cookies } from 'next/headers';

// Email template for RSVP reminders
function getReminderEmailHtml(name: string, daysRemaining: number): string {
  const urgency = daysRemaining <= 7 ? 'final' : daysRemaining <= 14 ? 'friendly' : 'gentle';

  const urgencyText = {
    final: `<p style="color: #dc3545; font-weight: bold;">This is your final reminder - the RSVP deadline is in ${daysRemaining} days!</p>`,
    friendly: `<p>Just a friendly reminder that the RSVP deadline is coming up in ${daysRemaining} days.</p>`,
    gentle: `<p>We wanted to remind you that we&apos;d love to hear from you! The RSVP deadline is ${daysRemaining} days away.</p>`,
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Georgia, 'Times New Roman', serif; background-color: #1a1a1a; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #2d2d2d; border-radius: 8px; overflow: hidden; border: 1px solid #4a5d4a;">
        <div style="background: linear-gradient(135deg, #4a5d4a 0%, #3d4d3d 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #d4af37; font-size: 28px; margin: 0; font-weight: normal;">Nate & Blake</h1>
          <p style="color: #c9d4c9; margin: 10px 0 0 0; font-size: 14px;">October 31, 2027</p>
        </div>

        <div style="padding: 40px 30px; color: #c9d4c9;">
          <h2 style="color: #d4af37; font-size: 24px; margin: 0 0 20px 0; font-weight: normal;">RSVP Reminder</h2>

          <p style="margin: 0 0 15px 0; line-height: 1.6;">Dear ${name},</p>

          ${urgencyText[urgency]}

          <p style="margin: 15px 0; line-height: 1.6;">
            We haven&apos;t received your RSVP yet and we&apos;d love to know if you can join us for our Halloween wedding celebration!
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://nateandblake.me/rsvp"
               style="display: inline-block; background-color: #d4af37; color: #1a1a1a; text-decoration: none; padding: 15px 40px; border-radius: 4px; font-weight: bold; font-size: 16px;">
              RSVP Now
            </a>
          </div>

          <p style="margin: 15px 0; line-height: 1.6; font-size: 14px; color: #8a9a8a;">
            If you&apos;ve already responded or have any questions, please reach out to us at
            <a href="mailto:wedding@nateandblake.me" style="color: #d4af37;">wedding@nateandblake.me</a>
          </p>

          <p style="margin: 30px 0 0 0; line-height: 1.6;">
            With love,<br>
            <span style="color: #d4af37;">Nate & Blake</span>
          </p>
        </div>

        <div style="background-color: #242424; padding: 20px; text-align: center; border-top: 1px solid #4a5d4a;">
          <p style="color: #6a7a6a; font-size: 12px; margin: 0;">
            RSVP Deadline: September 1, 2027
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// POST /api/admin/reminders/send - Manually trigger reminder send
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { testMode, testEmail } = body;

    // Get Microsoft tokens
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('microsoft_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Microsoft account not connected. Please connect your Outlook account first.' },
        { status: 401 }
      );
    }

    // Get reminder settings
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('min_interval_days')
      .single();

    const minIntervalDays = settings?.min_interval_days || 7;

    // Calculate days until deadline
    const rsvpDeadline = new Date('2027-09-01T23:59:59');
    const now = new Date();
    const daysRemaining = Math.ceil((rsvpDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // If test mode, just send to test email
    if (testMode && testEmail) {
      const html = getReminderEmailHtml('Test Guest', daysRemaining);

      await sendEmail(accessToken, {
        to: [testEmail],
        subject: '[TEST] RSVP Reminder: Nate & Blake\'s Wedding',
        html,
      });

      return NextResponse.json({
        success: true,
        message: `Test reminder sent to ${testEmail}`,
        testMode: true,
      });
    }

    // Get non-responders
    const { data: addresses } = await supabase
      .from('guest_addresses')
      .select('email, name');

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('email');

    const rsvpEmails = new Set((rsvps || []).map(r => r.email.toLowerCase()));
    const nonResponders = (addresses || []).filter(a => !rsvpEmails.has(a.email.toLowerCase()));

    if (nonResponders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No non-responders to send reminders to',
        sent: 0,
      });
    }

    // Check who has received a reminder recently
    const minIntervalDate = new Date();
    minIntervalDate.setDate(minIntervalDate.getDate() - minIntervalDays);

    const { data: recentReminders } = await supabase
      .from('guest_reminder_log')
      .select('email')
      .gte('sent_at', minIntervalDate.toISOString());

    const recentlyReminded = new Set((recentReminders || []).map(r => r.email.toLowerCase()));

    // Filter out recently reminded
    const toRemind = nonResponders.filter(n => !recentlyReminded.has(n.email.toLowerCase()));

    if (toRemind.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${nonResponders.length} non-responders were reminded within the last ${minIntervalDays} days`,
        sent: 0,
        skipped: nonResponders.length,
      });
    }

    // Create a campaign for tracking
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .insert([{
        name: `Manual RSVP Reminder - ${new Date().toLocaleDateString()}`,
        type: 'rsvp_reminder',
        subject: 'RSVP Reminder: Nate & Blake\'s Wedding',
        body_html: getReminderEmailHtml('{{name}}', daysRemaining),
        segment: { rsvp_status: 'not_responded' },
        status: 'sending',
        created_by: 'manual',
      }])
      .select()
      .single();

    // Send reminders
    let successCount = 0;
    let failCount = 0;

    for (const guest of toRemind) {
      try {
        const html = getReminderEmailHtml(guest.name, daysRemaining);

        await sendEmail(accessToken, {
          to: [guest.email],
          subject: 'RSVP Reminder: Nate & Blake\'s Wedding',
          html,
        });

        // Log the reminder
        await supabase
          .from('guest_reminder_log')
          .insert([{
            email: guest.email.toLowerCase(),
            reminder_type: 'manual',
            campaign_id: campaign?.id,
          }]);

        // Create email send record
        if (campaign) {
          await supabase
            .from('email_sends')
            .insert([{
              campaign_id: campaign.id,
              email: guest.email,
              guest_name: guest.name,
              status: 'sent',
              sent_at: new Date().toISOString(),
            }]);
        }

        successCount++;

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send reminder to ${guest.email}:`, error);

        if (campaign) {
          await supabase
            .from('email_sends')
            .insert([{
              campaign_id: campaign.id,
              email: guest.email,
              guest_name: guest.name,
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            }]);
        }

        failCount++;
      }
    }

    // Update campaign status
    if (campaign) {
      await supabase
        .from('email_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
    }

    // Update last manual send timestamp
    await supabase
      .from('reminder_settings')
      .update({ last_manual_send: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update any row

    return NextResponse.json({
      success: true,
      message: `Reminders sent: ${successCount} succeeded, ${failCount} failed`,
      sent: successCount,
      failed: failCount,
      skipped: nonResponders.length - toRemind.length,
      total: nonResponders.length,
    });
  } catch (error) {
    console.error('Reminder send error:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
