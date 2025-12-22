import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// GET /api/admin/tags - List all tags with guest counts
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Get all unique tags with counts
    const { data: tags, error } = await supabase
      .from('guest_tags')
      .select('tag');

    if (error) throw error;

    // Count guests per tag
    const tagCounts: Record<string, number> = {};
    for (const { tag } of tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Convert to array format
    const tagList = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count,
    })).sort((a, b) => a.tag.localeCompare(b.tag));

    return NextResponse.json({ tags: tagList });
  } catch (error) {
    console.error('Admin tags fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tags - Create new tag (for managing custom tags)
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { tag, emails } = await request.json();

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Normalize tag name
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '_');

    // If emails provided, add tag to those guests
    if (emails && Array.isArray(emails) && emails.length > 0) {
      const records = emails.map((email: string) => ({
        email: email.toLowerCase().trim(),
        tag: normalizedTag,
      }));

      const { error } = await supabase
        .from('guest_tags')
        .upsert(records, { onConflict: 'email,tag' });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Tag "${normalizedTag}" added to ${emails.length} guest(s)`,
      });
    }

    return NextResponse.json({
      success: true,
      tag: normalizedTag,
    });
  } catch (error) {
    console.error('Admin tag create error:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tags - Delete a tag (removes from all guests)
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { tag, email } = await request.json();

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const normalizedTag = tag.toLowerCase().trim();

    if (email) {
      // Remove tag from specific guest
      const { error } = await supabase
        .from('guest_tags')
        .delete()
        .eq('email', email.toLowerCase().trim())
        .eq('tag', normalizedTag);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Tag "${normalizedTag}" removed from guest`,
      });
    } else {
      // Remove tag from all guests
      const { error, count } = await supabase
        .from('guest_tags')
        .delete()
        .eq('tag', normalizedTag);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Tag "${normalizedTag}" removed from ${count || 0} guest(s)`,
      });
    }
  } catch (error) {
    console.error('Admin tag delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
