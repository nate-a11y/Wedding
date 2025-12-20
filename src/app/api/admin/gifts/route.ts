import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get all gifts
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('gifts')
      .select(`
        *,
        rsvp:rsvps(id, name, email)
      `)
      .order('received_date', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const totalCash = data?.filter(g => g.gift_type === 'cash' || g.gift_type === 'check')
      .reduce((sum, g) => sum + (Number(g.amount) || 0), 0) || 0;
    const totalGifts = data?.length || 0;
    const thankYouPending = data?.filter(g => !g.thank_you_sent).length || 0;

    return NextResponse.json({
      gifts: data || [],
      totals: {
        totalCash,
        totalGifts,
        thankYouPending,
      },
    });
  } catch (error) {
    console.error('Gifts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gifts' },
      { status: 500 }
    );
  }
}

// Create a new gift
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
      giver_name,
      giver_email,
      gift_type,
      description,
      amount,
      received_date,
      thank_you_sent,
      thank_you_sent_date,
      linked_rsvp_id,
      notes,
    } = body;

    const { data, error } = await supabase
      .from('gifts')
      .insert({
        giver_name,
        giver_email: giver_email || null,
        gift_type: gift_type || 'cash',
        description: description || null,
        amount: amount || null,
        received_date: received_date || new Date().toISOString().split('T')[0],
        thank_you_sent: thank_you_sent || false,
        thank_you_sent_date: thank_you_sent_date || null,
        linked_rsvp_id: linked_rsvp_id || null,
        notes: notes || null,
      })
      .select(`
        *,
        rsvp:rsvps(id, name, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ gift: data });
  } catch (error) {
    console.error('Gift create error:', error);
    return NextResponse.json(
      { error: 'Failed to create gift' },
      { status: 500 }
    );
  }
}

// Update a gift
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

    // If marking thank you as sent and no date provided, set it to today
    if (updates.thank_you_sent === true && !updates.thank_you_sent_date) {
      updates.thank_you_sent_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('gifts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        rsvp:rsvps(id, name, email)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ gift: data });
  } catch (error) {
    console.error('Gift update error:', error);
    return NextResponse.json(
      { error: 'Failed to update gift' },
      { status: 500 }
    );
  }
}

// Delete a gift
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
      .from('gifts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gift delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete gift' },
      { status: 500 }
    );
  }
}
