import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/guests/tags - Get tags for a specific guest or all guests with tags
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      // Get tags for specific guest
      const { data, error } = await supabase
        .from('guest_tags')
        .select('tag, created_at')
        .eq('email', email.toLowerCase().trim())
        .order('tag');

      if (error) throw error;

      return NextResponse.json({
        email: email.toLowerCase().trim(),
        tags: data?.map(d => d.tag) || [],
      });
    } else {
      // Get all guests with their tags
      const { data, error } = await supabase
        .from('guest_tags')
        .select('email, tag')
        .order('email');

      if (error) throw error;

      // Group by email
      const guestTags: Record<string, string[]> = {};
      for (const { email, tag } of data || []) {
        if (!guestTags[email]) {
          guestTags[email] = [];
        }
        guestTags[email].push(tag);
      }

      return NextResponse.json({ guestTags });
    }
  } catch (error) {
    console.error('Admin guest tags fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest tags' },
      { status: 500 }
    );
  }
}

// POST /api/admin/guests/tags - Add tag(s) to guest(s)
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { emails, tags } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'At least one tag is required' },
        { status: 400 }
      );
    }

    // Create records for all email/tag combinations
    const records: Array<{ email: string; tag: string }> = [];
    for (const email of emails) {
      for (const tag of tags) {
        records.push({
          email: email.toLowerCase().trim(),
          tag: tag.toLowerCase().trim().replace(/\s+/g, '_'),
        });
      }
    }

    const { error } = await supabase
      .from('guest_tags')
      .upsert(records, { onConflict: 'email,tag' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Added ${tags.length} tag(s) to ${emails.length} guest(s)`,
      count: records.length,
    });
  } catch (error) {
    console.error('Admin guest tags add error:', error);
    return NextResponse.json(
      { error: 'Failed to add tags' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/guests/tags - Remove tag(s) from guest(s)
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { emails, tags } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'At least one tag is required' },
        { status: 400 }
      );
    }

    // Delete all matching records
    const normalizedEmails = emails.map((e: string) => e.toLowerCase().trim());
    const normalizedTags = tags.map((t: string) => t.toLowerCase().trim());

    const { error, count } = await supabase
      .from('guest_tags')
      .delete()
      .in('email', normalizedEmails)
      .in('tag', normalizedTags);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Removed tags from guests`,
      count: count || 0,
    });
  } catch (error) {
    console.error('Admin guest tags remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove tags' },
      { status: 500 }
    );
  }
}
