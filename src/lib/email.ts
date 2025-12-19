import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Debug: Log if API key is present (not the actual key)
if (typeof window === 'undefined') {
  console.log('Resend API configured:', !!RESEND_API_KEY, RESEND_API_KEY ? `Key starts with: ${RESEND_API_KEY.substring(0, 6)}...` : 'No key');
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

// Send email using Resend REST API directly (more reliable than SDK on Vercel)
async function sendEmail(options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo || 'nateandblakesayido@outlook.com',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return { error: data.message || 'Failed to send email' };
    }

    return { id: data.id };
  } catch (error) {
    console.error('Fetch error sending email:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Log email to database
async function logEmail(data: {
  resendId?: string;
  direction: 'outbound' | 'inbound';
  from: string;
  to: string;
  subject: string;
  status: string;
  emailType?: string;
  relatedId?: string;
}) {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('Database not configured, skipping email log');
    return;
  }

  try {
    await supabase.from('emails').insert({
      resend_id: data.resendId || null,
      direction: data.direction,
      from_address: data.from,
      to_address: data.to,
      subject: data.subject,
      status: data.status,
      email_type: data.emailType || null,
      related_id: data.relatedId || null,
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
}

interface RSVPEmailData {
  to: string;
  name: string;
  attending: boolean;
  mealChoice?: string | null;
  dietaryRestrictions?: string | null;
  additionalGuests?: AdditionalGuest[];
  songRequest?: string | null;
  message?: string | null;
}

export async function sendRSVPConfirmation(data: RSVPEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping confirmation email');
    return false;
  }

  const { to, name, attending, mealChoice, dietaryRestrictions, additionalGuests = [], songRequest, message } = data;

  const partySize = 1 + additionalGuests.length;
  const subject = attending
    ? partySize > 1
      ? `We can't wait to celebrate with your party of ${partySize}! 🎃`
      : "We can't wait to celebrate with you! 🎃"
    : "Thank you for letting us know";

  // Generate HTML for additional guests
  const guestsHtml = additionalGuests.length > 0 ? `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #536537;">
      <p style="color: #d4af37; margin: 5px 0 15px 0; font-weight: bold;">Additional Guests (${additionalGuests.length})</p>
      ${additionalGuests.map((guest) => `
        <div style="margin-bottom: 10px; padding: 10px; background: #141414; border-radius: 4px;">
          <p style="color: #a5b697; margin: 3px 0;"><strong>${guest.name}</strong>${guest.isChild ? ' <span style="color: #d4af37; font-size: 12px;">(Child)</span>' : ''}</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const attendingHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          We're thrilled that you'll be joining us on our special day! Your RSVP has been received${partySize > 1 ? ` for your party of ${partySize}` : ''}.
        </p>

        <div style="background: #121212; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">Your RSVP Details</h3>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Name:</strong> ${name}</p>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Status:</strong> Attending ✓</p>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Party Size:</strong> ${partySize} ${partySize === 1 ? 'guest' : 'guests'}</p>
          ${dietaryRestrictions ? `<p style="color: #a5b697; margin: 5px 0;"><strong>Dietary Restrictions:</strong> ${dietaryRestrictions}</p>` : ''}
          ${guestsHtml}
          ${songRequest ? `<p style="color: #a5b697; margin: 15px 0 5px 0;"><strong>Song Request:</strong> ${songRequest}</p>` : ''}
        </div>
        ${message ? `
          <div style="background: #121212; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Message</h3>
            <p style="color: #a5b697; font-style: italic; line-height: 1.6;">"${message}"</p>
          </div>
        ` : ''}
      </div>

      <div style="text-align: center; color: #536537; font-size: 14px;">
        <p style="color: #d4af37;">#NateAndBlakeSayIDo2027</p>
        <p>More details coming soon at <a href="https://nateandblake.me" style="color: #d4af37;">nateandblake.me</a></p>
      </div>
    </div>
  `;

  const notAttendingHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          We're sorry you won't be able to join us, but we truly appreciate you letting us know.
          You'll be in our thoughts on our special day!
        </p>
        ${message ? `
          <div style="background: #121212; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Message</h3>
            <p style="color: #a5b697; font-style: italic; line-height: 1.6;">"${message}"</p>
          </div>
        ` : ''}
      </div>

      <div style="text-align: center; color: #536537; font-size: 14px;">
        <p style="color: #d4af37;">#NateAndBlakeSayIDo2027</p>
        <p>Visit us at <a href="https://nateandblake.me" style="color: #d4af37;">nateandblake.me</a></p>
      </div>
    </div>
  `;

  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';

  const result = await sendEmail({
    from: fromAddress,
    to: [to],
    subject: subject,
    html: attending ? attendingHtml : notAttendingHtml,
  });

  if (result.error) {
    console.error('Failed to send email:', result.error);
    await logEmail({
      direction: 'outbound',
      from: fromAddress,
      to: to,
      subject: subject,
      status: 'failed',
      emailType: 'rsvp_confirmation',
    });
    return false;
  }

  await logEmail({
    resendId: result.id,
    direction: 'outbound',
    from: fromAddress,
    to: to,
    subject: subject,
    status: 'sent',
    emailType: 'rsvp_confirmation',
  });

  console.log('Confirmation email sent to:', to);
  return true;
}

interface AddressEmailData {
  to: string;
  name: string;
  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isUpdate: boolean;
}

export async function sendAddressConfirmation(data: AddressEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping address confirmation email');
    return false;
  }

  const { to, name, address, isUpdate } = data;
  const subject = isUpdate
    ? "Your address has been updated!"
    : "You're on our list! 🎃";

  const addressLines = [
    address.street,
    address.street2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country !== 'United States' ? address.country : null,
  ].filter(Boolean).join('<br/>');

  const mainMessage = isUpdate
    ? "We've updated your mailing address in our records. You're all set to receive your save the date around Halloween 2026 and your formal invitation in April 2027!"
    : "We're so excited you'll be part of our wedding journey! Your address has been saved, and you're officially on our mailing list.";

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://www.nateandblake.me/Save%20the%20Date.png" alt="Save the Date - Nate & Blake - October 31, 2027" width="300" style="width: 300px; max-width: 100%; height: auto; border-radius: 8px;" />
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          ${mainMessage}
        </p>

        ${!isUpdate ? `
        <div style="margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">What's next?</h3>
          <p style="color: #a5b697; line-height: 1.6;">
            Official save the dates will be mailed around Halloween 2026, with formal invitations (including RSVP details) following in April 2027. In the meantime, enjoy this sneak peek!
          </p>
        </div>
        ` : ''}

        <div style="background: #121212; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">Your Address on File</h3>
          <p style="color: #a5b697; margin: 5px 0; line-height: 1.8;">${addressLines}</p>
        </div>

        <p style="color: #a5b697; margin-top: 20px; font-size: 14px;">
          Need to make changes? Just submit the form again with your email address and we'll update your information.
        </p>
      </div>

      <div style="text-align: center; color: #536537; font-size: 14px;">
        <p style="color: #d4af37;">#NateAndBlakeSayIDo2027</p>
        <p>Visit us at <a href="https://nateandblake.me" style="color: #d4af37;">nateandblake.me</a></p>
      </div>
    </div>
  `;

  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';

  const result = await sendEmail({
    from: fromAddress,
    to: [to],
    subject: subject,
    html: html,
  });

  if (result.error) {
    console.error('Failed to send address confirmation email:', result.error);
    await logEmail({
      direction: 'outbound',
      from: fromAddress,
      to: to,
      subject: subject,
      status: 'failed',
      emailType: 'address_confirmation',
    });
    return false;
  }

  await logEmail({
    resendId: result.id,
    direction: 'outbound',
    from: fromAddress,
    to: to,
    subject: subject,
    status: 'sent',
    emailType: 'address_confirmation',
  });

  console.log('Address confirmation email sent to:', to);
  return true;
}

interface GuestbookEmailData {
  to: string;
  name: string;
  message: string;
}

export async function sendGuestbookThankYou(data: GuestbookEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping guestbook thank you email');
    return false;
  }

  const { to, name, message } = data;
  const subject = "Thank you for signing our guest book! 💕";

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          Your kind words mean so much to us. Thank you for taking the time to sign our guest book!
        </p>

        <div style="background: #121212; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">Your Message</h3>
          <p style="color: #a5b697; font-style: italic; line-height: 1.6;">"${message}"</p>
        </div>
      </div>

      <div style="text-align: center; color: #536537; font-size: 14px;">
        <p style="color: #a5b697;">We can't wait to celebrate with you!</p>
        <p style="color: #d4af37;">#NateAndBlakeSayIDo2027</p>
        <p>Visit us at <a href="https://nateandblake.me" style="color: #d4af37;">nateandblake.me</a></p>
      </div>
    </div>
  `;

  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';

  const result = await sendEmail({
    from: fromAddress,
    to: [to],
    subject: subject,
    html: html,
  });

  if (result.error) {
    console.error('Failed to send guestbook email:', result.error);
    await logEmail({
      direction: 'outbound',
      from: fromAddress,
      to: to,
      subject: subject,
      status: 'failed',
      emailType: 'guestbook_thank_you',
    });
    return false;
  }

  await logEmail({
    resendId: result.id,
    direction: 'outbound',
    from: fromAddress,
    to: to,
    subject: subject,
    status: 'sent',
    emailType: 'guestbook_thank_you',
  });

  console.log('Guestbook thank you email sent to:', to);
  return true;
}

interface BulkEmailRecipient {
  email: string;
  name: string;
  address?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  rsvpStatus?: 'attending' | 'not_attending' | null;
}

// Process template variables in content
function processTemplateVariables(content: string, recipient: BulkEmailRecipient): string {
  let processed = content;

  // Basic variables
  processed = processed.replace(/\{\{name\}\}/gi, recipient.name);
  processed = processed.replace(/\{\{email\}\}/gi, recipient.email);
  processed = processed.replace(/\{\{first_name\}\}/gi, recipient.name.split(' ')[0]);

  // Address variables
  if (recipient.address) {
    const addr = recipient.address;
    processed = processed.replace(/\{\{street\}\}/gi, addr.street);
    processed = processed.replace(/\{\{street2\}\}/gi, addr.street2 || '');
    processed = processed.replace(/\{\{city\}\}/gi, addr.city);
    processed = processed.replace(/\{\{state\}\}/gi, addr.state);
    processed = processed.replace(/\{\{zip\}\}/gi, addr.postalCode);
    processed = processed.replace(/\{\{postal_code\}\}/gi, addr.postalCode);
    processed = processed.replace(/\{\{country\}\}/gi, addr.country);

    // Full address
    const fullAddress = [
      addr.street,
      addr.street2,
      `${addr.city}, ${addr.state} ${addr.postalCode}`,
      addr.country !== 'United States' ? addr.country : null,
    ].filter(Boolean).join(', ');
    processed = processed.replace(/\{\{full_address\}\}/gi, fullAddress);
  } else {
    // Clear address placeholders if no address
    processed = processed.replace(/\{\{street\}\}/gi, '');
    processed = processed.replace(/\{\{street2\}\}/gi, '');
    processed = processed.replace(/\{\{city\}\}/gi, '');
    processed = processed.replace(/\{\{state\}\}/gi, '');
    processed = processed.replace(/\{\{zip\}\}/gi, '');
    processed = processed.replace(/\{\{postal_code\}\}/gi, '');
    processed = processed.replace(/\{\{country\}\}/gi, '');
    processed = processed.replace(/\{\{full_address\}\}/gi, '');
  }

  // RSVP status
  if (recipient.rsvpStatus) {
    const statusText = recipient.rsvpStatus === 'attending' ? 'Attending' : 'Not Attending';
    processed = processed.replace(/\{\{rsvp_status\}\}/gi, statusText);
  } else {
    processed = processed.replace(/\{\{rsvp_status\}\}/gi, 'No RSVP');
  }

  return processed;
}

interface BulkEmailResult {
  email: string;
  success: boolean;
  error?: string;
}

// Generate the branded HTML template for a recipient
function generateBrandedEmailHtml(recipient: BulkEmailRecipient, htmlContent: string): string {
  // Process template variables in the content
  const processedContent = processTemplateVariables(htmlContent, recipient);

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <div style="color: #a5b697; line-height: 1.6;">
          ${processedContent}
        </div>
      </div>

      <div style="text-align: center; color: #536537; font-size: 14px;">
        <p style="color: #d4af37;">#NateAndBlakeSayIDo2027</p>
        <p>Visit us at <a href="https://nateandblake.me" style="color: #d4af37;">nateandblake.me</a></p>
      </div>
    </div>
  `;
}

// Send batch emails using Resend's batch API (up to 100 per request)
async function sendBatchEmails(emails: Array<{
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
}>): Promise<{ data?: Array<{ id: string }>; error?: string }> {
  if (!RESEND_API_KEY) {
    return { error: 'API key not configured' };
  }

  // Add reply_to to all emails if not specified
  const emailsWithReplyTo = emails.map(email => ({
    ...email,
    reply_to: email.reply_to || 'nateandblakesayido@outlook.com',
  }));

  try {
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailsWithReplyTo),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend batch API error:', data);
      return { error: data.message || 'Failed to send batch emails' };
    }

    return { data: data.data };
  } catch (error) {
    console.error('Fetch error sending batch emails:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function sendBulkEmail(data: {
  recipients: BulkEmailRecipient[];
  subject: string;
  htmlContent: string;
}): Promise<{ results: BulkEmailResult[]; successCount: number; failCount: number }> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping bulk email');
    return { results: [], successCount: 0, failCount: data.recipients.length };
  }

  const { recipients, subject, htmlContent } = data;
  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';
  const results: BulkEmailResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Resend batch API supports up to 100 emails per request
  const BATCH_SIZE = 100;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Prepare batch emails with personalized content (process subject line too)
    const batchEmails = batch.map(recipient => ({
      from: fromAddress,
      to: [recipient.email],
      subject: processTemplateVariables(subject, recipient),
      html: generateBrandedEmailHtml(recipient, htmlContent),
    }));

    const batchResult = await sendBatchEmails(batchEmails);

    if (batchResult.error) {
      // If batch fails, mark all as failed
      console.error('Batch send failed:', batchResult.error);
      for (const recipient of batch) {
        results.push({ email: recipient.email, success: false, error: batchResult.error });
        failCount++;
        await logEmail({
          direction: 'outbound',
          from: fromAddress,
          to: recipient.email,
          subject,
          status: 'failed',
          emailType: 'bulk_announcement',
        });
      }
    } else if (batchResult.data) {
      // Log each successful email
      for (let j = 0; j < batch.length; j++) {
        const recipient = batch[j];
        const emailResult = batchResult.data[j];
        results.push({ email: recipient.email, success: true });
        successCount++;
        await logEmail({
          resendId: emailResult?.id,
          direction: 'outbound',
          from: fromAddress,
          to: recipient.email,
          subject,
          status: 'sent',
          emailType: 'bulk_announcement',
        });
      }
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Bulk email complete: ${successCount} sent, ${failCount} failed`);
  return { results, successCount, failCount };
}
