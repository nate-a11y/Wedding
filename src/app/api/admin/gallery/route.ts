import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { logAdminAuditEvent, getAuditErrorDetails } from '@/lib/admin-audit';
import { badRequest } from '@/lib/api-response';
import { serializeGalleryPhoto, type GalleryPhotoRecord } from '@/lib/gallery';
import {
  buildGalleryStoragePaths,
  createPhotoVariants,
  formatBytes,
  inferPhotoMime,
  isSupportedPhotoMime,
  MAX_PHOTO_UPLOAD_BYTES,
  WEDDING_BUCKET,
} from '@/lib/media';

export const runtime = 'nodejs';

const MAX_CATEGORY_LENGTH = 40;
const MAX_CAPTION_LENGTH = 300;

function notConfigured() {
  return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function getString(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

async function removeStorageObjects(paths: Array<string | null | undefined>) {
  const safePaths = paths.filter((path): path is string => Boolean(path));
  if (safePaths.length === 0 || !supabase) return;

  const { error } = await supabase.storage.from(WEDDING_BUCKET).remove(safePaths);
  if (error) {
    console.error('Gallery storage cleanup error:', error);
  }
}

// GET - All gallery photos (including hidden) for the admin manager
export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) return notConfigured();

  try {
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      photos: (data || []).map((photo) => serializeGalleryPhoto(photo as GalleryPhotoRecord)),
    });
  } catch (error) {
    console.error('Admin gallery fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery photos' }, { status: 500 });
  }
}

// POST - Upload a new gallery photo (multipart form: file, category, caption)
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) return notConfigured();

  const db = supabase;

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return badRequest('Invalid form data');
    }

    const file = formData.get('file');
    const category = (getString(formData.get('category')) || 'couple').toLowerCase();
    const caption = getString(formData.get('caption')) || null;

    if (!isFile(file) || file.size <= 0) {
      return badRequest('File is required');
    }

    if (category.length > MAX_CATEGORY_LENGTH) {
      return badRequest('Category is too long');
    }

    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      return badRequest('Caption is too long');
    }

    if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Photo is too large. Maximum upload size is ${formatBytes(MAX_PHOTO_UPLOAD_BYTES)}.` },
        { status: 413 }
      );
    }

    const contentType = inferPhotoMime(file.name, file.type);
    if (!isSupportedPhotoMime(contentType)) {
      return badRequest('Invalid file type. Please upload a JPEG, PNG, WebP, HEIC, or HEIF image.');
    }

    const uploadId = crypto.randomUUID();
    const input = Buffer.from(await file.arrayBuffer());

    let variants;
    try {
      variants = await createPhotoVariants(input, uploadId, buildGalleryStoragePaths(uploadId));
    } catch (variantError) {
      console.error('Gallery image processing error:', variantError);
      return badRequest('Could not process this image. Please try a JPEG, PNG, or WebP photo.');
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
      console.error('Gallery storage upload error:', uploadError);
      await removeStorageObjects(uploadedPaths);
      return NextResponse.json(
        { error: 'Failed to upload photo. Please try again.' },
        { status: 500 }
      );
    }

    // Append to the end of the gallery by default
    const { data: lastPhoto } = await db
      .from('gallery_photos')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (lastPhoto?.sort_order ?? 0) + 1;

    const { data: photoData, error: dbError } = await db
      .from('gallery_photos')
      .insert([{
        category,
        caption,
        sort_order: sortOrder,
        is_visible: true,
        file_name: variants.fileName,
        original_file_path: variants.originalPath,
        display_file_path: variants.displayPath,
        thumbnail_file_path: variants.thumbnailPath,
        content_type: variants.contentType,
        file_size_bytes: variants.displayBuffer.byteLength,
        width: variants.width,
        height: variants.height,
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Gallery database error:', dbError);
      await removeStorageObjects(uploadedPaths);
      return NextResponse.json(
        { error: 'Failed to save photo. Please try again.' },
        { status: 500 }
      );
    }

    await logAdminAuditEvent({
      request,
      action: 'create',
      entity: 'gallery_photo',
      entityId: photoData.id,
      status: 'success',
      details: { category, hasCaption: Boolean(caption) },
    });

    return NextResponse.json({
      success: true,
      photo: serializeGalleryPhoto(photoData as GalleryPhotoRecord),
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    await logAdminAuditEvent({
      request,
      action: 'create',
      entity: 'gallery_photo',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// PATCH - Update caption, category, visibility, or sort order
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) return notConfigured();

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return badRequest('Photo id is required');
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.category === 'string') {
      const category = body.category.trim().toLowerCase();
      if (!category || category.length > MAX_CATEGORY_LENGTH) {
        return badRequest('Invalid category');
      }
      updates.category = category;
    }

    if (body.caption !== undefined) {
      const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
      if (caption.length > MAX_CAPTION_LENGTH) {
        return badRequest('Caption is too long');
      }
      updates.caption = caption || null;
    }

    if (typeof body.is_visible === 'boolean') {
      updates.is_visible = body.is_visible;
    }

    if (typeof body.sort_order === 'number' && Number.isInteger(body.sort_order)) {
      updates.sort_order = body.sort_order;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid updates provided');
    }

    const { data, error } = await supabase
      .from('gallery_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ photo: serializeGalleryPhoto(data as GalleryPhotoRecord) });
  } catch (error) {
    console.error('Gallery update error:', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}

// DELETE - Remove a gallery photo and its storage objects
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) return notConfigured();

  try {
    const { id } = await request.json();

    if (!id || typeof id !== 'string') {
      return badRequest('Photo id is required');
    }

    const { data: photo, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await removeStorageObjects([
      photo.original_file_path,
      photo.display_file_path,
      photo.thumbnail_file_path,
    ]);

    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'gallery_photo',
      entityId: id,
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery delete error:', error);
    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'gallery_photo',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
