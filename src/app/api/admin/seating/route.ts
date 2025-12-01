import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET - Fetch all tables with their assignments
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('seating_tables')
      .select('*')
      .order('name');

    if (tablesError) throw tablesError;

    // Get all assignments
    const { data: assignments, error: assignError } = await supabase
      .from('seating_assignments')
      .select('*')
      .order('guest_name');

    if (assignError) throw assignError;

    // Get unassigned attending guests
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, name, email, additional_guests')
      .eq('attending', true);

    if (rsvpError) throw rsvpError;

    // Build list of all guests (primary + additional)
    const allGuests: Array<{
      name: string;
      rsvpId: string;
      email: string;
      isAdditionalGuest: boolean;
    }> = [];

    rsvps?.forEach(rsvp => {
      // Primary guest
      allGuests.push({
        name: rsvp.name,
        rsvpId: rsvp.id,
        email: rsvp.email,
        isAdditionalGuest: false,
      });

      // Additional guests
      const additionalGuests = rsvp.additional_guests || [];
      additionalGuests.forEach((guest: { name: string }) => {
        allGuests.push({
          name: guest.name,
          rsvpId: rsvp.id,
          email: rsvp.email,
          isAdditionalGuest: true,
        });
      });
    });

    // Filter out already assigned guests
    const assignedNames = new Set(assignments?.map(a => a.guest_name.toLowerCase()) || []);
    const unassignedGuests = allGuests.filter(g => !assignedNames.has(g.name.toLowerCase()));

    return NextResponse.json({
      tables: tables || [],
      assignments: assignments || [],
      unassignedGuests,
    });
  } catch (error) {
    console.error('Seating fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seating data' },
      { status: 500 }
    );
  }
}

// POST - Create a new table
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, capacity = 8, table_type = 'round', notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('seating_tables')
      .insert([{ name: name.trim(), capacity, table_type, notes }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, table: data });
  } catch (error) {
    console.error('Table create error:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}

// PATCH - Update a table
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

    if (!id) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('seating_tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, table: data });
  } catch (error) {
    console.error('Table update error:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a table (and its assignments)
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('seating_tables')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Table delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}
