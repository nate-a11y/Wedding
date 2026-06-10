import sharp from 'sharp';

export const WEDDING_BUCKET = 'wedding';
export const GUESTBOOK_MEDIA_BUCKET = 'guestbook-media';

export const MAX_PHOTO_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_GUESTBOOK_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_GUESTBOOK_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_GUESTBOOK_MEDIA_SECONDS = 120;

const PHOTO_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const PHOTO_EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const GUESTBOOK_MIME_TO_EXTENSION: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/x-m4a': 'm4a',
};

const GUESTBOOK_EXTENSION_TO_MIME: Record<string, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
};

export type GuestbookMediaType = 'video' | 'audio';

export interface PhotoVariants {
  id: string;
  displayPath: string;
  thumbnailPath: string;
  originalPath: string;
  fileName: string;
  displayBuffer: Buffer;
  thumbnailBuffer: Buffer;
  originalBuffer: Buffer;
  width: number | null;
  height: number | null;
  contentType: 'image/jpeg';
}

function extensionFromName(fileName: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension && extension !== fileName.toLowerCase() ? extension : null;
}

function cleanMime(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() || '';
}

export function inferPhotoMime(fileName: string, mimeType: string): string {
  const normalized = cleanMime(mimeType);
  if (PHOTO_MIME_TO_EXTENSION[normalized]) return normalized;

  const extension = extensionFromName(fileName);
  return extension ? PHOTO_EXTENSION_TO_MIME[extension] || normalized : normalized;
}

export function inferGuestbookMime(fileName: string, mimeType: string, mediaType: GuestbookMediaType): string {
  const normalized = cleanMime(mimeType);
  if (GUESTBOOK_MIME_TO_EXTENSION[normalized]) return normalized;

  const extension = extensionFromName(fileName);
  const inferred = extension ? GUESTBOOK_EXTENSION_TO_MIME[extension] : undefined;
  if (inferred?.startsWith(`${mediaType}/`)) return inferred;
  return normalized;
}

export function isSupportedPhotoMime(mimeType: string): boolean {
  return Boolean(PHOTO_MIME_TO_EXTENSION[cleanMime(mimeType)]);
}

export function isSupportedGuestbookMime(mimeType: string, mediaType: GuestbookMediaType): boolean {
  const normalized = cleanMime(mimeType);
  if (!GUESTBOOK_MIME_TO_EXTENSION[normalized]) return false;
  return normalized.startsWith(`${mediaType}/`);
}

export function getGuestbookMediaExtension(mimeType: string): string {
  return GUESTBOOK_MIME_TO_EXTENSION[cleanMime(mimeType)] || 'bin';
}

export function getGuestbookMediaMaxBytes(mediaType: GuestbookMediaType): number {
  return mediaType === 'video' ? MAX_GUESTBOOK_VIDEO_BYTES : MAX_GUESTBOOK_AUDIO_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildPhotoStoragePaths(id: string) {
  return {
    originalPath: `photos/original/${id}.jpg`,
    displayPath: `photos/display/${id}.jpg`,
    thumbnailPath: `photos/thumbnails/${id}.jpg`,
    fileName: `${id}.jpg`,
  };
}

export function buildGalleryStoragePaths(id: string) {
  return {
    originalPath: `gallery/original/${id}.jpg`,
    displayPath: `gallery/display/${id}.jpg`,
    thumbnailPath: `gallery/thumbnails/${id}.jpg`,
    fileName: `${id}.jpg`,
  };
}

export function buildGuestbookMediaPath(mediaType: GuestbookMediaType, mimeType: string, id = crypto.randomUUID()) {
  const date = new Date().toISOString().slice(0, 10);
  const extension = getGuestbookMediaExtension(mimeType);
  return `${mediaType}/${date}/${id}.${extension}`;
}

export function isSafeGuestbookMediaPath(path: string, mediaType?: GuestbookMediaType): boolean {
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) return false;
  const mediaPrefix = mediaType ? mediaType : '(video|audio)';
  const safePattern = new RegExp(`^${mediaPrefix}/\\d{4}-\\d{2}-\\d{2}/[0-9a-fA-F-]{36}\\.(webm|mp4|mov|mp3|m4a|aac|wav)$`);
  return safePattern.test(path);
}

export function validateDurationSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const duration = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(duration)) return null;
  const rounded = Math.round(duration);
  if (rounded < 0 || rounded > MAX_GUESTBOOK_MEDIA_SECONDS) return null;
  return rounded;
}

export async function createPhotoVariants(
  input: Buffer,
  id = crypto.randomUUID(),
  paths = buildPhotoStoragePaths(id)
): Promise<PhotoVariants> {
  const base = sharp(input, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();

  const originalBuffer = await base
    .clone()
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const displayBuffer = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const thumbnailBuffer = await base
    .clone()
    .resize({ width: 480, height: 480, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();

  return {
    id,
    ...paths,
    originalBuffer,
    displayBuffer,
    thumbnailBuffer,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    contentType: 'image/jpeg',
  };
}
