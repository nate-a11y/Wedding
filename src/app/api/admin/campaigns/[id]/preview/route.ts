import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { isEmailConfigured, sendLoggedEmail } from '@/lib/email';
import { requireAdminAuth } from '@/lib/admin-auth';

// POST /api/admin/campaigns/[id]/preview - Send preview to admin email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { previewEmail } = body;

    if (!previewEmail) {
      return NextResponse.json(
        { error: 'Preview email address is required' },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'Resend email is not configured' }, { status: 503 });
    }

    // Personalize with sample data
    const personalizedHtml = campaign.body_html
      .replace(/\{\{name\}\}/g, 'Sample Guest')
      .replace(/\{\{email\}\}/g, previewEmail);

    // Send preview email
    const result = await sendLoggedEmail({
      emailType: 'campaign_preview',
      to: [previewEmail],
      subject: `[PREVIEW] ${campaign.subject}`,
      html: `
        <div style="background: #fff3cd; padding: 12px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #ffc107;">
          <strong>This is a preview email.</strong> Variables like {{name}} have been replaced with sample data.
        </div>
        ${personalizedHtml}
      `,
    });
    if (result.error) throw new Error(result.error);

    return NextResponse.json({
      success: true,
      message: `Preview sent to ${previewEmail}`,
    });
  } catch (error) {
    console.error('Campaign preview error:', error);
    return NextResponse.json(
      { error: 'Failed to send preview' },
      { status: 500 }
    );
  }
}
