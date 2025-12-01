import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// POST - Assign guest to table
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tableId, guestName, rsvpId, isAdditionalGuest = false } = body;

    if (!tableId || !guestName?.trim()) {
      return NextResponse.json(
        { error: 'Table ID and guest name are required' },
        { status: 400 }
      );
    }

    // Check if guest is already assigned somewhere
    const { data: existing } = await supabase
      .from('seating_assignments')
      .select('id, table_id')
      .ilike('guest_name', guestName.trim())
      .single();

    if (existing) {
      // Move to new table
      const { data, error } = await supabase
        .from('seating_assignments')
        .update({ table_id: tableId })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, assignment: data, moved: true });
    }

    // Create new assignment
    const { data, error } = await supabase
      .from('seating_assignments')
      .insert([{
        table_id: tableId,
        guest_name: guestName.trim(),
        rsvp_id: rsvpId || null,
        is_additional_guest: isAdditionalGuest,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, assignment: data });
  } catch (error) {
    console.error('Assignment create error:', error);
    return NextResponse.json(
      { error: 'Failed to assign guest' },
      { status: 500 }
    );
  }
}

// DELETE - Remove guest from table
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id, guestName } = await request.json();

    if (!id && !guestName) {
      return NextResponse.json(
        { error: 'Assignment ID or guest name is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('seating_assignments').delete();

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.ilike('guest_name', guestName);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assignment delete error:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}
