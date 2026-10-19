import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { isEmailConfigured, sendEmail, sendBatchEmails } from '@/lib/email-provider';
import { getWelcomeVideoUrl } from '@/lib/welcome-video';

export { isEmailConfigured } from '@/lib/email-provider';

export async function isEmailFullyConfigured(): Promise<boolean> {
  return isEmailConfigured();
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
    const { error } = await supabase.from('emails').insert({
      resend_id: data.resendId || null,
      direction: data.direction,
      from_address: data.from,
      to_address: data.to,
      subject: data.subject,
      status: data.status,
      email_type: data.emailType || null,
      related_id: data.relatedId || null,
    });
    if (error) console.error('Failed to log email:', error.message);
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

// Campaigns, reminders, and Ops tests share the confirmation email log.
export async function sendLoggedEmail(options: Parameters<typeof sendEmail>[0] & {
  emailType: string;
  relatedId?: string;
}) {
  const result = await sendEmail(options);
  for (const to of options.to) {
    await logEmail({
      resendId: result.id,
      direction: 'outbound',
      from: options.from || 'Nate & Blake Say I Do <wedding@nateandblake.me>',
      to,
      subject: options.subject,
      status: result.error ? 'failed' : 'sent',
      emailType: options.emailType,
      relatedId: options.relatedId,
    });
  }
  return result;
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

  const { to, name, attending, dietaryRestrictions, additionalGuests = [], songRequest, message } = data;

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


interface RSVPEditLinkEmailData {
  to: string;
  name: string;
  editUrl: string;
  expiresAt: string;
}

export async function sendRSVPEditLink(data: RSVPEditLinkEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping RSVP edit link email');
    return false;
  }

  const { to, name, editUrl, expiresAt } = data;
  const subject = 'Your private RSVP edit link';
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: #252920; border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          Use the private link below to view or update your RSVP for Nate & Blake's wedding.
        </p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${editUrl}" style="display: inline-block; background: #d4af37; color: #111111; text-decoration: none; padding: 14px 22px; border-radius: 10px; font-weight: bold;">
            Open My RSVP
          </a>
        </p>
        <p style="color: #a5b697; line-height: 1.6; font-size: 14px;">
          This link expires ${expiresDate}. Please do not forward it — it gives access to your RSVP details.
        </p>
        <p style="color: #536537; line-height: 1.6; font-size: 12px; word-break: break-all;">
          ${editUrl}
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    from: fromAddress,
    to: [to],
    subject,
    html,
  });

  await logEmail({
    resendId: result.id,
    direction: 'outbound',
    from: fromAddress,
    to,
    subject,
    status: result.error ? 'failed' : 'sent',
    emailType: 'rsvp_edit_link',
  });

  if (result.error) {
    console.error('Failed to send RSVP edit link email:', result.error);
    return false;
  }

  return true;
}

interface AddressEmailData {
  to: string;
  name: string;
  address: {
    street: string;
    street2?: string;
    city: string;
    state?: string | null;
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
  const welcomeVideoUrl = getWelcomeVideoUrl(name);
  const subject = isUpdate
    ? "Your address has been updated!"
    : "You're on our list! 🎃";

  // Format city/state/postal code line based on available fields
  const cityStateLine = address.state
    ? `${address.city}, ${address.state} ${address.postalCode}`
    : `${address.city} ${address.postalCode}`;

  const addressLines = [
    address.street,
    address.street2,
    cityStateLine,
    address.country !== 'United States' ? address.country : null,
  ].filter(Boolean).join('<br/>');

  const mainMessage = isUpdate
    ? "We've updated your mailing address in our records. You're all set to receive your save the date around Halloween 2026 and your formal invitation in April 2027!"
    : "We're so excited you'll be part of our wedding journey! Your address has been saved, and you're officially on our mailing list.";

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; line-height: 1;">
          <img src="https://www.nateandblake.me/welcome/nate-and-blake-wordmark.png" alt="Nate &amp; Blake" width="340" style="display: block; width: 340px; max-width: 100%; height: auto; border: 0; margin: 0 auto;" />
        </h1>
        <p style="color: #a5b697; margin: 12px 0 0;">October 31, 2027</p>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${welcomeVideoUrl}" style="display: block; text-decoration: none;" aria-label="Watch your welcome video from Nate and Blake">
          <img src="https://www.nateandblake.me/welcome/welcome-v4-poster.jpg" alt="Play your welcome from Nate &amp; Blake — 45 seconds" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border: 0; border-radius: 8px; margin: 0 auto;" />
        </a>
        <p style="margin: 18px 0 0;">
          <a href="${welcomeVideoUrl}" style="display: inline-block; background: #536537; color: #faf9f6; border: 1px solid #d4af37; border-radius: 6px; padding: 14px 22px; font-size: 18px; text-decoration: none;">Watch your welcome video &rarr;</a>
        </p>
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
            Official save the dates will be mailed around Halloween 2026, with formal invitations (including RSVP details) following in April 2027. In the meantime, we made a little welcome for you — tap the video above to watch!
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
    state?: string | null;
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
    processed = processed.replace(/\{\{state\}\}/gi, addr.state || '');
    processed = processed.replace(/\{\{zip\}\}/gi, addr.postalCode);
    processed = processed.replace(/\{\{postal_code\}\}/gi, addr.postalCode);
    processed = processed.replace(/\{\{country\}\}/gi, addr.country);

    // Full address - format city/state/postal code line based on available fields
    const cityStateLine = addr.state
      ? `${addr.city}, ${addr.state} ${addr.postalCode}`
      : `${addr.city} ${addr.postalCode}`;
    const fullAddress = [
      addr.street,
      addr.street2,
      cityStateLine,
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

export async function sendBulkEmail(data: {
  recipients: BulkEmailRecipient[];
  subject: string;
  htmlContent: string;
}): Promise<{ results: BulkEmailResult[]; successCount: number; failCount: number; provider?: string }> {
  const { recipients, subject, htmlContent } = data;
  const fromAddress = 'Nate & Blake Say I Do <wedding@nateandblake.me>';
  const results: BulkEmailResult[] = [];
  let successCount = 0;
  let failCount = 0;

  if (!isEmailConfigured()) {
    console.log('Resend not configured, skipping bulk email');
    return { results: [], successCount: 0, failCount: recipients.length };
  }

  console.log(`Sending ${recipients.length} emails via Resend...`);

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

  console.log(`Bulk email via Resend complete: ${successCount} sent, ${failCount} failed`);
  return { results, successCount, failCount, provider: 'resend' };
}
