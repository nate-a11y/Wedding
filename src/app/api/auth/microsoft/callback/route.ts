import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getTodoLists, createTodoList } from '@/lib/microsoft-graph';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * GET /api/auth/microsoft/callback
 * Handles OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nateandblake.me';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin?tab=tasks&error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin?tab=tasks&error=no_code', baseUrl)
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.redirect(
        new URL('/admin?tab=tasks&error=db_not_configured', baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get or create a "Wedding Planning" list
    const lists = await getTodoLists(tokens.access_token);
    let weddingList = lists.find(l => l.displayName === 'Wedding Planning');

    if (!weddingList) {
      weddingList = await createTodoList(tokens.access_token, 'Wedding Planning');
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database (upsert - only one row allowed)
    const { error: dbError } = await supabase
      .from('microsoft_auth')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Fixed ID for singleton
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        todo_list_id: weddingList.id,
        todo_list_name: weddingList.displayName,
      }, {
        onConflict: 'id',
      });

    if (dbError) {
      console.error('Failed to store Microsoft tokens:', dbError);
      return NextResponse.redirect(
        new URL('/admin?tab=tasks&error=db_save_failed', baseUrl)
      );
    }

    // Redirect back to tasks tab with success
    return NextResponse.redirect(
      new URL('/admin?tab=tasks&microsoft=connected', baseUrl)
    );
  } catch (error) {
    console.error('Microsoft callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin?tab=tasks&error=callback_failed`, baseUrl)
    );
  }
}
