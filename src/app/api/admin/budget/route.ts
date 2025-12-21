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
    // Include vendor_id to filter out expenses linked to vendors (those are counted via vendor.amount_paid)
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('category_id, amount, amount_paid, payment_status, vendor_id');

    if (expensesError) throw expensesError;

    // Fetch vendors for contract/payment tracking
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('category_id, contract_amount, amount_paid, status');

    if (vendorsError) throw vendorsError;

    // Calculate spending by category from expenses
    // Only count standalone expenses (not linked to vendors) to avoid double-counting
    // Expenses linked to vendors are reflected in vendor.amount_paid (synced automatically)
    const spendingByCategory: Record<string, { total: number; paid: number }> = {};
    let uncategorizedExpenseTotal = 0;
    let uncategorizedExpensePaid = 0;

    expenses?.forEach(expense => {
      // Skip expenses linked to vendors - their amounts are tracked via vendor.amount_paid
      if (expense.vendor_id) return;

      const amount = Number(expense.amount) || 0;
      const amountPaid = Number(expense.amount_paid) || 0;

      if (expense.category_id) {
        if (!spendingByCategory[expense.category_id]) {
          spendingByCategory[expense.category_id] = { total: 0, paid: 0 };
        }
        spendingByCategory[expense.category_id].total += amount;
        spendingByCategory[expense.category_id].paid += amountPaid;
      } else {
        // Track uncategorized expenses for overall totals
        uncategorizedExpenseTotal += amount;
        uncategorizedExpensePaid += amountPaid;
      }
    });

    // Add vendor contracts to category totals
    let uncategorizedVendorTotal = 0;
    let uncategorizedVendorPaid = 0;

    vendors?.forEach(vendor => {
      const contractAmount = Number(vendor.contract_amount) || 0;
      const amountPaid = Number(vendor.amount_paid) || 0;

      if (vendor.category_id) {
        if (!spendingByCategory[vendor.category_id]) {
          spendingByCategory[vendor.category_id] = { total: 0, paid: 0 };
        }
        spendingByCategory[vendor.category_id].total += contractAmount;
        spendingByCategory[vendor.category_id].paid += amountPaid;
      } else {
        // Track uncategorized vendors for overall totals
        uncategorizedVendorTotal += contractAmount;
        uncategorizedVendorPaid += amountPaid;
      }
    });

    // Attach spending to categories
    const categoriesWithSpending = categories?.map(cat => ({
      ...cat,
      spent: spendingByCategory[cat.id]?.total || 0,
      paid: spendingByCategory[cat.id]?.paid || 0,
    }));

    // Calculate totals from both expenses and vendors (including uncategorized)
    const totalEstimated = categories?.reduce((sum, cat) => sum + (Number(cat.estimated_amount) || 0), 0) || 0;
    const categorizedSpent = Object.values(spendingByCategory).reduce((sum, s) => sum + s.total, 0);
    const categorizedPaid = Object.values(spendingByCategory).reduce((sum, s) => sum + s.paid, 0);
    const totalSpent = categorizedSpent + uncategorizedExpenseTotal + uncategorizedVendorTotal;
    const totalPaid = categorizedPaid + uncategorizedExpensePaid + uncategorizedVendorPaid;

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
