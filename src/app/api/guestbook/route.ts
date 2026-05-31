import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendGuestbookThankYou } from '@/lib/email';
import {
  GUESTBOOK_MEDIA_BUCKET,
  isSafeGuestbookMediaPath,
  MAX_GUESTBOOK_MEDIA_SECONDS,
} from '@/lib/media';

export const runtime = 'nodejs';

const guestbookSubmissionSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    email: z.string().trim().max(254, 'Email address is too long').email('Please enter a valid email address').toLowerCase(),
    message: z.preprocess(
      (value) => (value === null || value === undefined ? undefined : value),
      z.string().trim().max(500, 'Message is too long').optional()
    ),
    media_type: z.enum(['video', 'audio']).nullable().optional(),
    media_duration: z.number().min(0).max(MAX_GUESTBOOK_MEDIA_SECONDS).nullable().optional(),
    media_path: z.string().trim().max(512, 'Media path is too long').nullable().optional(),
    media_url: z.string().trim().max(2048, 'Media URL is too long').nullable().optional(),
  })
  .superRefine((body, ctx) => {
    const hasMessage = Boolean(body.message?.trim());
    const hasMedia = Boolean(body.media_path?.trim());

    if (!hasMessage && !hasMedia) {
      ctx.addIssue({ code: 'custom', path: ['message'], message: 'Please provide either a message or media' });
    }

    if (hasMedia) {
      if (!body.media_type) {
        ctx.addIssue({ code: 'custom', path: ['media_type'], message: 'Media type is required for media submissions' });
      } else if (!isSafeGuestbookMediaPath(body.media_path || '', body.media_type)) {
        ctx.addIssue({ code: 'custom', path: ['media_path'], message: 'Invalid media path' });
      }

      if (!body.media_duration || body.media_duration < 1 || body.media_duration > MAX_GUESTBOOK_MEDIA_SECONDS) {
        ctx.addIssue({ code: 'custom', path: ['media_duration'], message: 'Media duration must be between 1 and 120 seconds' });
      }
    }
  });

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: error.issues[0]?.message || 'Invalid guest book submission', issues: error.issues },
    { status: 400 }
  );
}

async function deleteGuestbookMedia(path: string | null | undefined) {
  if (!path || !supabase || !isSafeGuestbookMediaPath(path)) return;

  const { error } = await supabase.storage.from(GUESTBOOK_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error('Failed to clean up guestbook media:', error);
  }
}

async function guestbookMediaExists(path: string): Promise<boolean> {
  if (!supabase || !isSafeGuestbookMediaPath(path)) return false;

  const pathParts = path.split('/');
  const fileName = pathParts.pop();
  const folder = pathParts.join('/');
  if (!fileName || !folder) return false;

  const { data, error } = await supabase.storage
    .from(GUESTBOOK_MEDIA_BUCKET)
    .list(folder, { limit: 1, search: fileName });

  if (error) {
    console.error('Guestbook media lookup error:', error);
    return false;
  }

  return Boolean(data?.some((item) => item.name === fileName));
}

// GET - Fetch all guest book entries
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Guest book is not configured' },
      { status: 503 }
    );
  }

  const db = supabase;

  try {
    const { data, error } = await db
      .from('guestbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch guest book entries' },
        { status: 500 }
      );
    }

    const entries = (data || []).map((entry) => {
      if (entry.media_path && !entry.media_url) {
        const { data: urlData } = db.storage
          .from(GUESTBOOK_MEDIA_BUCKET)
          .getPublicUrl(entry.media_path);
        return { ...entry, media_url: urlData.publicUrl };
      }
      return entry;
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Guest book fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Add a new guest book entry
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Guest book is not configured' },
      { status: 503 }
    );
  }

  const ip = getIp(request);
  const rateLimit = await checkRateLimit(`guestbook:${ip}`, { windowMs: 60000, maxRequests: 3 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = guestbookSubmissionSchema.safeParse(payload);
  if (!parsed.success) return validationError(parsed.error);

  const body = parsed.data;
  const mediaPath = body.media_path?.trim() || null;
  const mediaUrl = mediaPath
    ? supabase.storage.from(GUESTBOOK_MEDIA_BUCKET).getPublicUrl(mediaPath).data.publicUrl
    : null;

  if (mediaPath && !(await guestbookMediaExists(mediaPath))) {
    return NextResponse.json({ error: 'Uploaded media could not be found. Please try again.' }, { status: 400 });
  }

  const entryData = {
    name: body.name.trim(),
    email: body.email,
    message: body.message ? body.message.trim() : null,
    media_url: mediaUrl,
    media_type: mediaPath ? body.media_type : null,
    media_duration: mediaPath ? body.media_duration : null,
    ...(mediaPath ? { media_path: mediaPath } : {}),
  };

  try {
    const { data, error } = await supabase
      .from('guestbook')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      await deleteGuestbookMedia(mediaPath);
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      );
    }

    // Send thank you email (await to see logs, but don't fail if email fails)
    try {
      await sendGuestbookThankYou({
        to: entryData.email,
        name: entryData.name,
        message: entryData.message || 'Thank you for your message!',
      });
    } catch (err) {
      console.error('Failed to send guestbook thank you email:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for signing our guest book!',
      entry: data,
    });
  } catch (error) {
    console.error('Guest book error:', error);
    await deleteGuestbookMedia(mediaPath);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
