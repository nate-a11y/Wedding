import { supabase } from '@/lib/supabase-server';
import { WEDDING_BUCKET } from '@/lib/media';

export interface GalleryPhotoRecord {
  id: string;
  category: string;
  caption: string | null;
  sort_order: number;
  is_visible: boolean;
  file_name: string;
  original_file_path: string;
  display_file_path: string;
  thumbnail_file_path: string;
  content_type: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export function serializeGalleryPhoto(photo: GalleryPhotoRecord) {
  const getPublicUrl = (path: string) =>
    supabase!.storage.from(WEDDING_BUCKET).getPublicUrl(path).data.publicUrl;

  return {
    id: photo.id,
    category: photo.category,
    caption: photo.caption,
    sort_order: photo.sort_order,
    is_visible: photo.is_visible,
    width: photo.width,
    height: photo.height,
    created_at: photo.created_at,
    display_url: getPublicUrl(photo.display_file_path),
    thumbnail_url: getPublicUrl(photo.thumbnail_file_path),
    full_url: getPublicUrl(photo.original_file_path),
  };
}
