import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Update a budget category
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { id, estimated_amount, name, color, icon } = body;

    const updateData: Record<string, unknown> = {};
    if (estimated_amount !== undefined) updateData.estimated_amount = estimated_amount;
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const { data, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category: data });
  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// Create a new budget category
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, estimated_amount, icon, color } = body;

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('budget_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        name,
        estimated_amount: estimated_amount || 0,
        icon,
        color,
        sort_order: (maxOrder?.sort_order || 0) + 1,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category: data });
  } catch (error) {
    console.error('Category create error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// Delete a budget category
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
      .from('budget_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
