import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/reminders/status - Get reminder automation status
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get reminder settings
    const { data: settings } = await supabase
      .from('reminder_settings')
      .select('*')
      .single();

    // Get non-responder count (addresses without matching RSVP)
    const { data: addresses } = await supabase
      .from('guest_addresses')
      .select('email');

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('email');

    const rsvpEmails = new Set((rsvps || []).map(r => r.email.toLowerCase()));
    const nonResponders = (addresses || []).filter(a => !rsvpEmails.has(a.email.toLowerCase()));

    // Get last reminder sent info
    const { data: lastReminder } = await supabase
      .from('guest_reminder_log')
      .select('sent_at, reminder_type')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    // Get recent reminder history
    const { data: recentReminders } = await supabase
      .from('guest_reminder_log')
      .select('email, reminder_type, sent_at')
      .order('sent_at', { ascending: false })
      .limit(50);

    // Calculate RSVP deadline and days remaining
    const rsvpDeadline = new Date('2027-09-01T23:59:59');
    const now = new Date();
    const daysUntilDeadline = Math.ceil((rsvpDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if we're in RSVP window
    const rsvpStart = new Date('2027-04-01T00:00:00');
    const inRsvpWindow = now >= rsvpStart && now <= rsvpDeadline;

    return NextResponse.json({
      settings: settings || {
        enabled: false,
        reminder_days: [30, 14, 7],
        min_interval_days: 7,
      },
      nonResponderCount: nonResponders.length,
      lastReminder: lastReminder || null,
      recentReminders: recentReminders || [],
      rsvpDeadline: rsvpDeadline.toISOString(),
      daysUntilDeadline,
      inRsvpWindow,
    });
  } catch (error) {
    console.error('Reminder status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder status' },
      { status: 500 }
    );
  }
}
