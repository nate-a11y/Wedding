import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { badRequest } from '@/lib/api-response';
import {
  createPhotoVariants,
  formatBytes,
  inferPhotoMime,
  isSupportedPhotoMime,
  MAX_PHOTO_UPLOAD_BYTES,
  WEDDING_BUCKET,
} from '@/lib/media';

export const runtime = 'nodejs';

interface PhotoRecord {
  id: string;
  guest_name: string;
  file_path: string;
  file_name: string;
  caption: string | null;
  is_visible: boolean;
  created_at: string;
  source?: 'camera' | 'upload';
  original_file_path?: string | null;
  display_file_path?: string | null;
  thumbnail_file_path?: string | null;
  content_type?: string | null;
  file_size_bytes?: number | null;
  original_file_size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
}

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function getString(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function getPublicUrl(path: string) {
  return supabase!.storage.from(WEDDING_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function removeStorageObjects(paths: Array<string | null | undefined>) {
  const safePaths = paths.filter((path): path is string => Boolean(path));
  if (safePaths.length === 0 || !supabase) return;

  const { error } = await supabase.storage.from(WEDDING_BUCKET).remove(safePaths);
  if (error) {
    console.error('Storage cleanup error:', error);
  }
}

function validatePhotoForm(formData: FormData) {
  const file = formData.get('file');
  const guestName = getString(formData.get('guestName'));
  const caption = getString(formData.get('caption')) || null;
  const sourceValue = getString(formData.get('source'));
  const source = sourceValue === 'camera' ? 'camera' : 'upload';

  if (!isFile(file) || file.size <= 0) {
    return { success: false as const, response: badRequest('File is required') };
  }

  if (!guestName) {
    return { success: false as const, response: badRequest('Guest name is required') };
  }

  if (guestName.length > 120) {
    return { success: false as const, response: badRequest('Guest name is too long') };
  }

  if (caption && caption.length > 500) {
    return { success: false as const, response: badRequest('Caption is too long') };
  }

  if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: `Photo is too large. Maximum upload size is ${formatBytes(MAX_PHOTO_UPLOAD_BYTES)}.` },
        { status: 413 }
      ),
    };
  }

  const contentType = inferPhotoMime(file.name, file.type);

  if (!isSupportedPhotoMime(contentType)) {
    return { success: false as const, response: badRequest('Invalid file type. Please upload a JPEG, PNG, WebP, HEIC, or HEIF image.') };
  }

  return { success: true as const, data: { file, guestName, caption, source, contentType } };
}

function serializePhoto(photo: PhotoRecord) {
  const displayPath = photo.display_file_path || photo.file_path;
  const thumbnailPath = photo.thumbnail_file_path || displayPath;
  const fullPath = photo.original_file_path || displayPath;

  return {
    ...photo,
    url: getPublicUrl(displayPath),
    display_url: getPublicUrl(displayPath),
    thumbnail_url: getPublicUrl(thumbnailPath),
    full_url: getPublicUrl(fullPath),
  };
}

// GET - Fetch all visible photos
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Photo storage is not configured' },
      { status: 503 }
    );
  }

  const db = supabase;

  try {
    const { data, error } = await db
      .from('photos')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ photos: (data || []).map((photo) => serializePhoto(photo as PhotoRecord)) });
  } catch (error) {
    console.error('Photos fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Upload a new photo
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Photo storage is not configured' },
      { status: 503 }
    );
  }

  // Rate limiting - 10 photos per minute
  const ip = getIp(request);
  const rateLimit = await checkRateLimit(`photos:${ip}`, { windowMs: 60000, maxRequests: 10 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  const db = supabase;

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return badRequest('Invalid form data');
    }

    const parsed = validatePhotoForm(formData);
    if (!parsed.success) return parsed.response;

    const { file, guestName, caption, source, contentType } = parsed.data;
    const uploadId = crypto.randomUUID();
    const input = Buffer.from(await file.arrayBuffer());

    let variants;
    try {
      variants = await createPhotoVariants(input, uploadId);
    } catch (variantError) {
      console.error('Image processing error:', variantError);
      return NextResponse.json(
        { error: 'Could not process this image. Please try a JPEG, PNG, or WebP photo.' },
        { status: 400 }
      );
    }

    const uploadedPaths: string[] = [];

    const uploadVariant = async (path: string, buffer: Buffer) => {
      const { error } = await db.storage
        .from(WEDDING_BUCKET)
        .upload(path, buffer, {
          contentType: variants.contentType,
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) throw error;
      uploadedPaths.push(path);
    };

    try {
      await uploadVariant(variants.originalPath, variants.originalBuffer);
      await uploadVariant(variants.displayPath, variants.displayBuffer);
      await uploadVariant(variants.thumbnailPath, variants.thumbnailBuffer);
    } catch (uploadError) {
      console.error('Storage upload error:', uploadError);
      await removeStorageObjects(uploadedPaths);
      return NextResponse.json(
        { error: 'Failed to upload photo. Please try again.' },
        { status: 500 }
      );
    }

    const insertPayload = {
      guest_name: guestName,
      file_path: variants.displayPath,
      file_name: variants.fileName,
      caption: caption || null,
      source,
      original_file_path: variants.originalPath,
      display_file_path: variants.displayPath,
      thumbnail_file_path: variants.thumbnailPath,
      content_type: contentType,
      file_size_bytes: variants.displayBuffer.byteLength,
      original_file_size_bytes: file.size,
      width: variants.width,
      height: variants.height,
    };

    const { data: photoData, error: dbError } = await db
      .from('photos')
      .insert([insertPayload])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      await removeStorageObjects(uploadedPaths);
      return NextResponse.json(
        { error: 'Failed to save photo. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully!',
      photo: serializePhoto(photoData as PhotoRecord),
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
