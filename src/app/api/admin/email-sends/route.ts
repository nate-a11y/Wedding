import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/email-sends - Get recent email sends
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data: sends, error } = await supabase
      .from('email_sends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      sends: sends || [],
    });
  } catch (error) {
    console.error('Email sends fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email sends' },
      { status: 500 }
    );
  }
}
