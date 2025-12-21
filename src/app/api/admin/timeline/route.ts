import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get all timeline events
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('timeline_events')
      .select(`
        *,
        vendor:vendors(id, name, phone, email)
      `)
      .order('event_date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      events: data || [],
      stats: {
        total: data?.length || 0,
        milestones: data?.filter(e => e.is_milestone).length || 0,
      },
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}

// Create a new timeline event
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      duration_minutes,
      location,
      location_notes,
      responsible_person,
      participants,
      vendor_id,
      category,
      is_milestone,
      color,
      notes,
      staff_notes,
    } = body;

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('timeline_events')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        title,
        description: description || null,
        event_date: event_date || '2027-10-31',
        start_time,
        end_time: end_time || null,
        duration_minutes: duration_minutes || null,
        location: location || null,
        location_notes: location_notes || null,
        responsible_person: responsible_person || null,
        participants: participants || null,
        vendor_id: vendor_id || null,
        category: category || 'other',
        is_milestone: is_milestone || false,
        color: color || null,
        notes: notes || null,
        staff_notes: staff_notes || null,
        sort_order: (maxOrder?.sort_order || 0) + 1,
      })
      .select(`
        *,
        vendor:vendors(id, name, phone, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ event: data });
  } catch (error) {
    console.error('Timeline create error:', error);
    return NextResponse.json(
      { error: 'Failed to create timeline event' },
      { status: 500 }
    );
  }
}

// Update a timeline event
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from('timeline_events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        vendor:vendors(id, name, phone, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ event: data });
  } catch (error) {
    console.error('Timeline update error:', error);
    return NextResponse.json(
      { error: 'Failed to update timeline event' },
      { status: 500 }
    );
  }
}

// Delete a timeline event
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await request.json();

    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Timeline delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete timeline event' },
      { status: 500 }
    );
  }
}
