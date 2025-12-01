import { Resend } from 'resend';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Debug: Log if API key is present (not the actual key)
if (typeof window === 'undefined') {
  console.log('Resend API configured:', !!apiKey, apiKey ? `Key starts with: ${apiKey.substring(0, 6)}...` : 'No key');
}

export function isEmailConfigured(): boolean {
  return resend !== null;
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
  if (!resend) {
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

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: attending ? attendingHtml : notAttendingHtml,
    });

    if (error) {
      console.error('Failed to send email:', error);
      // Log failed email
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

    // Log successful email
    await logEmail({
      resendId: data?.id,
      direction: 'outbound',
      from: fromAddress,
      to: to,
      subject: subject,
      status: 'sent',
      emailType: 'rsvp_confirmation',
    });

    console.log('Confirmation email sent to:', to);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

interface GuestbookEmailData {
  to: string;
  name: string;
  message: string;
}

export async function sendGuestbookThankYou(data: GuestbookEmailData): Promise<boolean> {
  if (!resend) {
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

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Failed to send guestbook email:', error);
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
      resendId: emailData?.id,
      direction: 'outbound',
      from: fromAddress,
      to: to,
      subject: subject,
      status: 'sent',
      emailType: 'guestbook_thank_you',
    });

    console.log('Guestbook thank you email sent to:', to);
    return true;
  } catch (error) {
    console.error('Guestbook email error:', error);
    return false;
  }
}
