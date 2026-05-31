import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { exchangeCodeForTokens, getTodoLists, createTodoList, createWebhookSubscription } from '@/lib/microsoft-graph';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';

const MICROSOFT_OAUTH_STATE_COOKIE = 'microsoft_oauth_state';

function isValidOAuthState(returnedState: string | null, cookieState: string | undefined): boolean {
  if (!returnedState || !cookieState) return false;

  const returned = Buffer.from(returnedState);
  const stored = Buffer.from(cookieState);
  return returned.length === stored.length && timingSafeEqual(returned, stored);
}

function redirectWithClearedState(path: string, baseUrl: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, baseUrl));
  response.cookies.set({
    name: MICROSOFT_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/microsoft',
    maxAge: 0,
  });
  return response;
}

/**
 * GET /api/auth/microsoft/callback
 * Handles OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nateandblake.me';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const cookieState = request.cookies.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;

    if (!isValidOAuthState(state, cookieState)) {
      console.error('Microsoft OAuth state validation failed');
      return redirectWithClearedState('/admin?tab=tasks&error=invalid_state', baseUrl);
    }

    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return redirectWithClearedState(
        `/admin?tab=tasks&error=${encodeURIComponent(error)}`,
        baseUrl
      );
    }

    if (!code) {
      return redirectWithClearedState('/admin?tab=tasks&error=no_code', baseUrl);
    }

    if (!isSupabaseConfigured() || !supabase) {
      return redirectWithClearedState('/admin?tab=tasks&error=db_not_configured', baseUrl);
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
      return redirectWithClearedState('/admin?tab=tasks&error=db_save_failed', baseUrl);
    }

    // Set up webhook for real-time sync from Microsoft when configured.
    // Manual sync still works without MICROSOFT_WEBHOOK_SECRET in Vercel.
    if (process.env.MICROSOFT_WEBHOOK_SECRET) {
      try {
        const webhookUrl = `${baseUrl}/api/webhooks/microsoft`;
        const subscription = await createWebhookSubscription(
          tokens.access_token,
          weddingList.id,
          webhookUrl
        );

        // Store webhook subscription info
        await supabase
          .from('microsoft_auth')
          .update({
            webhook_subscription_id: subscription.id,
            webhook_expires_at: subscription.expirationDateTime,
          })
          .eq('id', '00000000-0000-0000-0000-000000000001');
      } catch (webhookError) {
        // Don't fail the whole flow if webhook setup fails
        console.error('Failed to set up webhook (sync will still work manually):', webhookError);
      }
    }

    // Redirect back to tasks tab with success
    return redirectWithClearedState('/admin?tab=tasks&microsoft=connected', baseUrl);
  } catch (error) {
    console.error('Microsoft callback error:', error);
    return redirectWithClearedState(`/admin?tab=tasks&error=callback_failed`, baseUrl);
  }
}
