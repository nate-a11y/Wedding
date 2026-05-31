import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { badRequest } from '@/lib/api-response';
import { parseFormData, photoUploadSchema } from '@/lib/validation';

const BUCKET_NAME = 'wedding';

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

    // Generate public URLs for each photo
    const photosWithUrls = data.map((photo) => {
      const { data: urlData } = db.storage
        .from(BUCKET_NAME)
        .getPublicUrl(photo.file_path);

      return {
        ...photo,
        url: urlData.publicUrl,
      };
    });

    return NextResponse.json({ photos: photosWithUrls });
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
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
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

    const parsed = parseFormData({
      file: formData.get('file'),
      guestName: formData.get('guestName'),
      caption: formData.get('caption') ?? undefined,
      source: formData.get('source') ?? undefined,
    }, photoUploadSchema);
    if (!parsed.success) return parsed.response;

    const { file, guestName, caption, source } = parsed.data;

    // Generate unique file name
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { error: uploadError } = await db.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo. Please try again.' },
        { status: 500 }
      );
    }

    // Save metadata to database
    const { data: photoData, error: dbError } = await db
      .from('photos')
      .insert([{
        guest_name: guestName.trim(),
        file_path: filePath,
        file_name: fileName,
        caption: caption?.trim() || null,
        source: source === 'camera' ? 'camera' : 'upload',
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up the uploaded file
      await db.storage.from(BUCKET_NAME).remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to save photo. Please try again.' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully!',
      photo: {
        ...photoData,
        url: urlData.publicUrl,
      },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
