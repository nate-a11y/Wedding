import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get all expenses
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        category:budget_categories(id, name, icon),
        vendor:vendors(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ expenses: data || [] });
  } catch (error) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// Create a new expense
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
      description,
      amount,
      category_id,
      vendor_id,
      payment_status,
      payment_date,
      payment_method,
      due_date,
      notes,
    } = body;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        description,
        amount,
        category_id: category_id || null,
        vendor_id: vendor_id || null,
        payment_status: payment_status || 'pending',
        payment_date: payment_date || null,
        payment_method: payment_method || null,
        due_date: due_date || null,
        notes: notes || null,
      })
      .select(`
        *,
        category:budget_categories(id, name, icon),
        vendor:vendors(id, name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error('Expense create error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// Update an expense
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
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:budget_categories(id, name, icon),
        vendor:vendors(id, name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error('Expense update error:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// Delete an expense
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
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expense delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
