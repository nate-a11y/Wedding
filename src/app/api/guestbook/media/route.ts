import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  buildGuestbookMediaPath,
  formatBytes,
  getGuestbookMediaMaxBytes,
  GUESTBOOK_MEDIA_BUCKET,
  inferGuestbookMime,
  isSafeGuestbookMediaPath,
  isSupportedGuestbookMime,
  MAX_GUESTBOOK_MEDIA_SECONDS,
  type GuestbookMediaType,
  validateDurationSeconds,
} from '@/lib/media';

export const runtime = 'nodejs';

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isMediaType(value: FormDataEntryValue | null): value is GuestbookMediaType {
  return value === 'video' || value === 'audio';
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return jsonError('Guest book media storage is not configured', 503);
  }

  const ip = getIp(request);
  const rateLimit = await checkRateLimit(`guestbook-media:${ip}`, { windowMs: 60000, maxRequests: 3 });
  if (!rateLimit.allowed) {
    return jsonError('Too many media uploads. Please wait a moment and try again.', 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('Invalid media upload', 400);
  }

  const mediaType = formData.get('media_type');
  const file = formData.get('file');
  const duration = validateDurationSeconds(formData.get('media_duration'));

  if (!isMediaType(mediaType)) {
    return jsonError('Media type must be audio or video', 400);
  }

  if (!isFile(file) || file.size <= 0) {
    return jsonError('Media file is required', 400);
  }

  if (duration === null || duration > MAX_GUESTBOOK_MEDIA_SECONDS) {
    return jsonError('Media must be 120 seconds or less', 400);
  }

  const maxBytes = getGuestbookMediaMaxBytes(mediaType);
  if (file.size > maxBytes) {
    return jsonError(`${mediaType === 'video' ? 'Video' : 'Audio'} is too large. Maximum size is ${formatBytes(maxBytes)}.`, 413);
  }

  const contentType = inferGuestbookMime(file.name, file.type, mediaType);

  if (!isSupportedGuestbookMime(contentType, mediaType)) {
    return jsonError(`Unsupported ${mediaType} format. Please use a common browser-recorded or mobile ${mediaType} file.`, 400);
  }

  const mediaPath = buildGuestbookMediaPath(mediaType, contentType);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(GUESTBOOK_MEDIA_BUCKET)
    .upload(mediaPath, buffer, {
      contentType,
      cacheControl: '604800',
      upsert: false,
    });

  if (uploadError) {
    console.error('Guestbook media upload error:', uploadError);
    return jsonError('Failed to upload media. Please try again.', 500);
  }

  const { data: urlData } = supabase.storage
    .from(GUESTBOOK_MEDIA_BUCKET)
    .getPublicUrl(mediaPath);

  return NextResponse.json({
    success: true,
    media: {
      path: mediaPath,
      url: urlData.publicUrl,
      type: mediaType,
      duration,
      size: file.size,
    },
  });
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return jsonError('Guest book media storage is not configured', 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const path = typeof payload === 'object' && payload !== null && 'path' in payload
    ? (payload as { path?: unknown }).path
    : undefined;
  const mediaType = typeof payload === 'object' && payload !== null && 'media_type' in payload
    ? (payload as { media_type?: unknown }).media_type
    : undefined;

  if (typeof path !== 'string' || !isSafeGuestbookMediaPath(path, mediaType === 'video' || mediaType === 'audio' ? mediaType : undefined)) {
    return jsonError('Invalid media path', 400);
  }

  const { error } = await supabase.storage.from(GUESTBOOK_MEDIA_BUCKET).remove([path]);
  if (error) {
    console.error('Guestbook media delete error:', error);
    return jsonError('Failed to delete media', 500);
  }

  return NextResponse.json({ success: true });
}
