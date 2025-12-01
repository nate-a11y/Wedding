import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Resend webhook events
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const event: ResendWebhookEvent = await request.json();

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
    const resendId = event.data.email_id;

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
          from_address: event.data.from,
          to_address: event.data.to[0],
          subject: event.data.subject,
          status: status,
          created_at: event.data.created_at,
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
