import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get budget settings and categories with spending totals
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Fetch budget settings
    const { data: settings, error: settingsError } = await supabase
      .from('budget_settings')
      .select('*')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (categoriesError) throw categoriesError;

    // Fetch expenses for spending totals
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('category_id, amount, payment_status');

    if (expensesError) throw expensesError;

    // Calculate spending by category
    const spendingByCategory: Record<string, { total: number; paid: number }> = {};
    expenses?.forEach(expense => {
      if (expense.category_id) {
        if (!spendingByCategory[expense.category_id]) {
          spendingByCategory[expense.category_id] = { total: 0, paid: 0 };
        }
        spendingByCategory[expense.category_id].total += Number(expense.amount) || 0;
        if (expense.payment_status === 'paid') {
          spendingByCategory[expense.category_id].paid += Number(expense.amount) || 0;
        }
      }
    });

    // Attach spending to categories
    const categoriesWithSpending = categories?.map(cat => ({
      ...cat,
      spent: spendingByCategory[cat.id]?.total || 0,
      paid: spendingByCategory[cat.id]?.paid || 0,
    }));

    // Calculate totals
    const totalEstimated = categories?.reduce((sum, cat) => sum + (Number(cat.estimated_amount) || 0), 0) || 0;
    const totalSpent = Object.values(spendingByCategory).reduce((sum, s) => sum + s.total, 0);
    const totalPaid = Object.values(spendingByCategory).reduce((sum, s) => sum + s.paid, 0);

    return NextResponse.json({
      settings: settings || { total_budget: 0, currency: 'USD' },
      categories: categoriesWithSpending || [],
      totals: {
        budget: settings?.total_budget || 0,
        estimated: totalEstimated,
        spent: totalSpent,
        paid: totalPaid,
        remaining: (settings?.total_budget || 0) - totalSpent,
      },
    });
  } catch (error) {
    console.error('Budget fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget data' },
      { status: 500 }
    );
  }
}

// Update budget settings
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { total_budget, currency } = body;

    // First check if settings exist
    const { data: existing } = await supabase
      .from('budget_settings')
      .select('id')
      .single();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from('budget_settings')
        .update({ total_budget, currency })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from('budget_settings')
        .insert({ total_budget, currency })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ settings: result.data });
  } catch (error) {
    console.error('Budget update error:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
