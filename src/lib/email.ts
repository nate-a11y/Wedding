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

interface RSVPEmailData {
  to: string;
  name: string;
  attending: boolean;
  mealChoice?: string | null;
  plusOne?: boolean;
  plusOneName?: string | null;
}

export async function sendRSVPConfirmation(data: RSVPEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping confirmation email');
    return false;
  }

  const { to, name, attending, mealChoice, plusOne, plusOneName } = data;

  const subject = attending
    ? "We can't wait to celebrate with you! 🎃"
    : "Thank you for letting us know";

  const attendingHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #faf9f6; padding: 40px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Nate & Blake</h1>
        <p style="color: #a5b697; margin: 5px 0;">October 31, 2027</p>
      </div>

      <div style="background: rgba(83, 101, 55, 0.2); border: 1px solid #536537; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #faf9f6; margin-top: 0;">Thank you, ${name}!</h2>
        <p style="color: #a5b697; line-height: 1.6;">
          We're thrilled that you'll be joining us on our special day! Your RSVP has been received.
        </p>

        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #d4af37; margin-top: 0;">Your RSVP Details</h3>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Name:</strong> ${name}</p>
          <p style="color: #a5b697; margin: 5px 0;"><strong>Status:</strong> Attending ✓</p>
          ${mealChoice ? `<p style="color: #a5b697; margin: 5px 0;"><strong>Meal Choice:</strong> ${mealChoice}</p>` : ''}
          ${plusOne && plusOneName ? `<p style="color: #a5b697; margin: 5px 0;"><strong>Plus One:</strong> ${plusOneName}</p>` : ''}
        </div>
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
