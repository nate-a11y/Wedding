import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { serializeGalleryPhoto, type GalleryPhotoRecord } from '@/lib/gallery';

export const runtime = 'nodejs';

// GET - Fetch all visible gallery photos for guests
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ photos: [] });
  }

  try {
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      photos: (data || []).map((photo) => serializeGalleryPhoto(photo as GalleryPhotoRecord)),
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery photos' },
      { status: 500 }
    );
  }
}
