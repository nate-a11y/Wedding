import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { sendBulkEmail } from '@/lib/email';

export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ emails: data || [] });
  } catch (error) {
    console.error('Admin emails fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, subject, htmlContent } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    const result = await sendBulkEmail({
      recipients,
      subject: subject.trim(),
      htmlContent,
    });

    return NextResponse.json({
      success: true,
      successCount: result.successCount,
      failCount: result.failCount,
      results: result.results,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
