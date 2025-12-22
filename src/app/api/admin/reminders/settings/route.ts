import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// PUT /api/admin/reminders/settings - Update reminder automation settings
export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { enabled, reminder_days, min_interval_days } = body;

    // Validate reminder_days is an array of positive numbers
    if (reminder_days !== undefined) {
      if (!Array.isArray(reminder_days) || !reminder_days.every(d => typeof d === 'number' && d > 0)) {
        return NextResponse.json(
          { error: 'reminder_days must be an array of positive numbers' },
          { status: 400 }
        );
      }
    }

    // Validate min_interval_days
    if (min_interval_days !== undefined) {
      if (typeof min_interval_days !== 'number' || min_interval_days < 1) {
        return NextResponse.json(
          { error: 'min_interval_days must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Get existing settings
    const { data: existing } = await supabase
      .from('reminder_settings')
      .select('id')
      .single();

    const updates: Record<string, unknown> = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (reminder_days !== undefined) updates.reminder_days = reminder_days;
    if (min_interval_days !== undefined) updates.min_interval_days = min_interval_days;

    if (existing) {
      const { data, error } = await supabase
        .from('reminder_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        settings: data,
      });
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('reminder_settings')
        .insert([{
          enabled: enabled ?? false,
          reminder_days: reminder_days ?? [30, 14, 7],
          min_interval_days: min_interval_days ?? 7,
        }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        settings: data,
      });
    }
  } catch (error) {
    console.error('Reminder settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder settings' },
      { status: 500 }
    );
  }
}
