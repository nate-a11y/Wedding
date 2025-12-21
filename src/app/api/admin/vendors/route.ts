import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Get all vendors
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const totals = {
      totalContracted: 0,
      totalPaid: 0,
      totalBalance: 0,
      countBooked: 0,
      countPaid: 0,
      countResearching: 0,
    };

    data?.forEach(vendor => {
      const contracted = Number(vendor.contract_amount) || 0;
      const paid = Number(vendor.amount_paid) || 0;
      totals.totalContracted += contracted;
      totals.totalPaid += paid;
      totals.totalBalance += (contracted - paid);

      if (vendor.status === 'booked') totals.countBooked++;
      else if (vendor.status === 'paid' || vendor.status === 'completed') totals.countPaid++;
      else if (vendor.status === 'researching') totals.countResearching++;
    });

    return NextResponse.json({
      vendors: data || [],
      totals,
    });
  } catch (error) {
    console.error('Vendors fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// Create a new vendor
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
      name,
      category_id,
      contact_name,
      email,
      phone,
      website,
      address,
      contract_amount,
      amount_paid,
      deposit_amount,
      deposit_paid,
      deposit_paid_date,
      payment_due_date,
      final_payment_date,
      notes,
      status,
    } = body;

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name,
        category_id: category_id || null,
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        contract_amount: contract_amount || 0,
        amount_paid: amount_paid || 0,
        deposit_amount: deposit_amount || 0,
        deposit_paid: deposit_paid || false,
        deposit_paid_date: deposit_paid_date || null,
        payment_due_date: payment_due_date || null,
        final_payment_date: final_payment_date || null,
        notes: notes || null,
        status: status || 'researching',
      })
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ vendor: data });
  } catch (error) {
    console.error('Vendor create error:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

// Update a vendor
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
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ vendor: data });
  } catch (error) {
    console.error('Vendor update error:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// Delete a vendor
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
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vendor delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
