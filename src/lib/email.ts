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

  // Helper to capitalize meal choice
  const formatMeal = (meal: string | null | undefined) => {
    if (!meal) return '';
    if (meal === 'kids') return 'Kids Meal';
    return meal.charAt(0).toUpperCase() + meal.slice(1);
  };

  // Generate HTML for additional guests
  const guestsHtml = additionalGuests.length > 0 ? `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #536537;">
      <p style="color: #d4af37; margin: 5px 0 15px 0; font-weight: bold;">Additional Guests (${additionalGuests.length})</p>
      ${additionalGuests.map((guest, index) => `
        <div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px;">
          <p style="color: #a5b697; margin: 3px 0;"><strong>${guest.name}</strong>${guest.isChild ? ' <span style="color: #d4af37; font-size: 12px;">(Child)</span>' : ''}</p>
          ${guest.mealChoice ? `<p style="color: #a5b697; margin: 3px 0; font-size: 14px;">Meal: ${formatMeal(guest.mealChoice)}</p>` : ''}
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

      <div style="background: rgba(83, 101, 55, 0.2); border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          We're thrilled that you'll be joining us on our special day! Your RSVP has been received${partySize > 1 ? ` for your party of ${partySize}` : ''}.
        </p>

        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">Your RSVP Details</h3>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Name:</strong> ${name}</p>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Status:</strong> Attending ✓</p>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Party Size:</strong> ${partySize} ${partySize === 1 ? 'guest' : 'guests'}</p>
          ${mealChoice ? `<p style="color: #a5b697; margin: 5px 0;"><strong>Your Meal:</strong> ${formatMeal(mealChoice)}</p>` : ''}
          ${dietaryRestrictions ? `<p style="color: #a5b697; margin: 5px 0;"><strong>Dietary Restrictions:</strong> ${dietaryRestrictions}</p>` : ''}
          ${guestsHtml}
          ${songRequest ? `<p style="color: #a5b697; margin: 15px 0 5px 0;"><strong>Song Request:</strong> ${songRequest}</p>` : ''}
        </div>
        ${message ? `
          <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
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

      <div style="background: rgba(83, 101, 55, 0.2); border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          We're sorry you won't be able to join us, but we truly appreciate you letting us know.
          You'll be in our thoughts on our special day!
        </p>
        ${message ? `
          <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
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
        <img src="https://www.nateandblake.me/Save%20the%20Date.png" alt="Save the Date - Nate & Blake - October 31, 2027" style="max-width: 100%; height: auto; border-radius: 8px;" />
      </div>

      <div style="background: rgba(83, 101, 55, 0.2); border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
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

        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
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

      <div style="background: rgba(83, 101, 55, 0.2); border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          Your kind words mean so much to us. Thank you for taking the time to sign our guest book!
        </p>

        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
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
