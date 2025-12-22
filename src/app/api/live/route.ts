import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/live - Get all live updates (public)
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ updates: [] });
  }

  try {
    const { data: updates, error } = await supabase
      .from('live_updates')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      updates: updates || [],
    });
  } catch (error) {
    console.error('Live updates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}
