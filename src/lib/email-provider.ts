export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
  from?: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ id?: string; error?: string; provider?: 'resend' }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { error: 'Resend API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || 'Nate & Blake Say I Do <wedding@nateandblake.me>',
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

    return { id: data.id, provider: 'resend' };
  } catch (error) {
    console.error('Fetch error sending email:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Send batch emails using Resend's batch API (up to 100 per request)
export async function sendBatchEmails(emails: Array<{
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
}>): Promise<{ data?: Array<{ id: string }>; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
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
