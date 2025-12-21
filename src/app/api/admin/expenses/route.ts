import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Helper function to recalculate and update a vendor's amount_paid based on linked expenses
async function updateVendorPaidAmount(vendorId: string) {
  if (!supabase) return;

  // Sum all amount_paid from expenses linked to this vendor
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_paid')
    .eq('vendor_id', vendorId);

  const totalPaid = expenses?.reduce((sum, e) => sum + (Number(e.amount_paid) || 0), 0) || 0;

  // Update the vendor's amount_paid
  await supabase
    .from('vendors')
    .update({ amount_paid: totalPaid })
    .eq('id', vendorId);
}

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

    // Calculate totals for all expenses
    const totals = {
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
      countPending: 0,
      countPartial: 0,
      countPaid: 0,
    };

    // Calculate totals for standalone expenses only (not linked to vendors)
    // Used to avoid double-counting when combined with vendor totals
    const standaloneTotals = {
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
    };

    data?.forEach(expense => {
      const amount = Number(expense.amount) || 0;
      const paid = Number(expense.amount_paid) || 0;

      // All expenses totals
      totals.totalAmount += amount;
      totals.totalPaid += paid;
      totals.totalBalance += (amount - paid);

      if (expense.payment_status === 'pending') totals.countPending++;
      else if (expense.payment_status === 'partial') totals.countPartial++;
      else if (expense.payment_status === 'paid') totals.countPaid++;

      // Standalone totals (expenses without vendor_id)
      if (!expense.vendor_id) {
        standaloneTotals.totalAmount += amount;
        standaloneTotals.totalPaid += paid;
        standaloneTotals.totalBalance += (amount - paid);
      }
    });

    return NextResponse.json({
      expenses: data || [],
      totals,
      standaloneTotals,
    });
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
      amount_paid,
      category_id,
      vendor_id,
      payment_status,
      payment_date,
      payment_method,
      due_date,
      notes,
    } = body;

    // Auto-determine payment status based on amounts
    let finalStatus = payment_status || 'pending';
    const amountNum = parseFloat(amount) || 0;
    const paidNum = parseFloat(amount_paid) || 0;
    if (paidNum >= amountNum && amountNum > 0) {
      finalStatus = 'paid';
    } else if (paidNum > 0) {
      finalStatus = 'partial';
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        description,
        amount,
        amount_paid: amount_paid || 0,
        category_id: category_id || null,
        vendor_id: vendor_id || null,
        payment_status: finalStatus,
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

    // If expense is linked to a vendor, update vendor's paid amount
    if (vendor_id && data) {
      await updateVendorPaidAmount(vendor_id);
    }

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

    // Get current expense to know old vendor and amounts
    const { data: current } = await supabase
      .from('expenses')
      .select('amount, amount_paid, vendor_id')
      .eq('id', id)
      .single();

    const oldVendorId = current?.vendor_id;

    // If amount or amount_paid is being updated, recalculate status
    if (updates.amount !== undefined || updates.amount_paid !== undefined) {
      const amountNum = parseFloat(updates.amount ?? current?.amount) || 0;
      const paidNum = parseFloat(updates.amount_paid ?? current?.amount_paid) || 0;

      if (paidNum >= amountNum && amountNum > 0) {
        updates.payment_status = 'paid';
      } else if (paidNum > 0) {
        updates.payment_status = 'partial';
      } else {
        updates.payment_status = 'pending';
      }
    }

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

    // Update vendor paid amounts if vendor changed or amount changed
    const newVendorId = data?.vendor_id;

    // If old vendor exists and is different from new, update old vendor
    if (oldVendorId && oldVendorId !== newVendorId) {
      await updateVendorPaidAmount(oldVendorId);
    }

    // If new vendor exists, update new vendor
    if (newVendorId) {
      await updateVendorPaidAmount(newVendorId);
    }

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

    // Get the expense's vendor_id before deleting
    const { data: expense } = await supabase
      .from('expenses')
      .select('vendor_id')
      .eq('id', id)
      .single();

    const vendorId = expense?.vendor_id;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // If expense was linked to a vendor, recalculate vendor's paid amount
    if (vendorId) {
      await updateVendorPaidAmount(vendorId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expense delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
