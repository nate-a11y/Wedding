import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

// Resend webhook event types
type OutboundEventType = 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
type InboundEventType = 'email.received';

interface OutboundWebhookEvent {
  type: OutboundEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

interface InboundWebhookEvent {
  type: InboundEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    created_at: string;
  };
}

type ResendWebhookEvent = OutboundWebhookEvent | InboundWebhookEvent;

// Verify webhook signature from Resend (uses Svix)
function verifySignature(payload: string, headers: Headers): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('RESEND_WEBHOOK_SECRET not configured, skipping verification');
    return true; // Allow in dev without secret
  }

  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  // Create signed content
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  // Get the secret without the whsec_ prefix
  const secretBytes = Buffer.from(WEBHOOK_SECRET.replace('whsec_', ''), 'base64');

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  // Check if any of the signatures match
  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    const [version, signature] = sig.split(',');
    if (version === 'v1' && signature === expectedSignature) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const payload = await request.text();

    // Verify webhook signature
    if (!verifySignature(payload, request.headers)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);

    // Handle inbound emails (received)
    if (event.type === 'email.received') {
      const inboundEvent = event as InboundWebhookEvent;
      await supabase
        .from('emails')
        .insert({
          resend_id: inboundEvent.data.email_id,
          direction: 'inbound',
          from_address: inboundEvent.data.from,
          to_address: inboundEvent.data.to,
          subject: inboundEvent.data.subject || '(No subject)',
          status: 'received',
          email_type: 'guest_reply',
          created_at: inboundEvent.data.created_at,
        });

      console.log('Inbound email received from:', inboundEvent.data.from);
      return NextResponse.json({ received: true });
    }

    // Handle outbound email status updates
    const outboundEvent = event as OutboundWebhookEvent;

    // Map Resend event types to our status
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.complained': 'complained',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    };

    const status = statusMap[event.type] || 'unknown';
    const resendId = outboundEvent.data.email_id;

    // Check if email already exists in our database
    const { data: existing } = await supabase
      .from('emails')
      .select('id')
      .eq('resend_id', resendId)
      .single();

    if (existing) {
      // Update existing email status
      await supabase
        .from('emails')
        .update({ status })
        .eq('resend_id', resendId);
    } else {
      // Insert new email record (for emails sent outside our system or missed)
      await supabase
        .from('emails')
        .insert({
          resend_id: resendId,
          direction: 'outbound',
          from_address: outboundEvent.data.from,
          to_address: outboundEvent.data.to[0],
          subject: outboundEvent.data.subject,
          status: status,
          created_at: outboundEvent.data.created_at,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Resend requires webhook endpoint to respond to GET for verification
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
