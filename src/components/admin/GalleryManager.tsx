'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

interface GalleryPhoto {
  id: string;
  category: string;
  caption: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  display_url: string;
  thumbnail_url: string;
  full_url: string;
}

interface ActionMessage {
  success: boolean;
  message: string;
}

const DEFAULT_CATEGORIES = ['couple', 'engagement'];

export default function GalleryManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  const [uploadCategory, setUploadCategory] = useState('couple');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gallery');
      const data = await res.json();
      if (res.ok) {
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      } else {
        setActionMessage({ success: false, message: data.error || 'Failed to load gallery' });
      }
    } catch (err) {
      console.error('Gallery load failed:', err);
      setActionMessage({ success: false, message: 'Failed to load gallery' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const categories = useMemo(() => {
    const existing = photos.map((photo) => photo.category);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]));
  }, [photos]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setActionMessage(null);

    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('category', uploadCategory);

      try {
        const res = await fetch('/api/admin/gallery', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.photo) {
          uploaded += 1;
          setPhotos((prev) => [...prev, data.photo]);
        } else {
          failed += 1;
          console.error('Gallery upload failed:', data.error);
        }
      } catch (err) {
        failed += 1;
        console.error('Gallery upload failed:', err);
      }
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActionMessage({
      success: failed === 0,
      message: failed === 0
        ? `Uploaded ${uploaded} photo${uploaded === 1 ? '' : 's'}`
        : `Uploaded ${uploaded}, failed ${failed} — check the file types and sizes`,
    });
  };

  const patchPhoto = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch('/api/admin/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMessage({ success: false, message: data.error || 'Failed to update photo' });
      return null;
    }
    return data.photo as GalleryPhoto;
  };

  const toggleVisibility = async (photo: GalleryPhoto) => {
    const updated = await patchPhoto(photo.id, { is_visible: !photo.is_visible });
    if (updated) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
    }
  };

  const saveEdit = async (photo: GalleryPhoto) => {
    const updated = await patchPhoto(photo.id, {
      caption: editCaption,
      category: editCategory || photo.category,
    });
    if (updated) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
      setEditingId(null);
    }
  };

  const deletePhoto = async (photo: GalleryPhoto) => {
    if (!confirm('Delete this photo from the gallery? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id }),
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      } else {
        const data = await res.json();
        setActionMessage({ success: false, message: data.error || 'Failed to delete photo' });
      }
    } catch (err) {
      console.error('Gallery delete failed:', err);
      setActionMessage({ success: false, message: 'Failed to delete photo' });
    }
  };

  const movePhoto = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;

    const a = photos[index];
    const b = photos[target];

    // Swap sort orders; fall back to index-based values if they collide.
    const aOrder = a.sort_order === b.sort_order ? target + 1 : b.sort_order;
    const bOrder = a.sort_order === b.sort_order ? index + 1 : a.sort_order;

    const [updatedA, updatedB] = await Promise.all([
      patchPhoto(a.id, { sort_order: aOrder }),
      patchPhoto(b.id, { sort_order: bOrder }),
    ]);

    if (updatedA && updatedB) {
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = { ...b, sort_order: bOrder };
        next[target] = { ...a, sort_order: aOrder };
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-olive-600 bg-charcoal-light p-6">
        <h3 className="text-xl font-medium text-cream">Upload gallery photos</h3>
        <p className="mt-1 text-sm text-olive-400">
          These appear on the guest-facing <a href="/gallery" target="_blank" rel="noopener noreferrer" className="text-gold-400 underline hover:text-gold-300">gallery page</a>.
          JPEG, PNG, WebP, or HEIC — they&apos;re optimized automatically.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-olive-200">Category</label>
            <input
              list="gallery-categories"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value.toLowerCase())}
              className="w-48 rounded-xl border border-olive-600 bg-charcoal px-3 py-2.5 text-cream focus:border-gold-500 focus:outline-none"
            />
            <datalist id="gallery-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-olive-200">Photos</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
              className="w-full text-sm text-olive-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-black hover:file:bg-gold-400 disabled:opacity-50"
            />
          </div>
        </div>

        {uploadProgress && (
          <p className="mt-3 text-sm text-gold-300">{uploadProgress}</p>
        )}
        {actionMessage && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
              actionMessage.success
                ? 'border-green-500/40 bg-green-500/10 text-green-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {actionMessage.message}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-black/30" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="py-12 text-center text-olive-400">
          No gallery photos yet — upload your engagement photos to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="rounded-lg border border-olive-800 bg-black/30 p-2">
              <div className={`relative aspect-square overflow-hidden rounded-lg ${!photo.is_visible ? 'opacity-50' : ''}`}>
                <Image
                  src={photo.thumbnail_url}
                  alt={photo.caption || `Gallery photo (${photo.category})`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
                {!photo.is_visible && (
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-yellow-300">Hidden</span>
                )}
              </div>

              {editingId === photo.id ? (
                <div className="mt-2 space-y-2">
                  <input
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="Caption"
                    className="w-full rounded border border-olive-600 bg-charcoal px-2 py-1 text-sm text-cream focus:border-gold-500 focus:outline-none"
                  />
                  <input
                    list="gallery-categories"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value.toLowerCase())}
                    placeholder="Category"
                    className="w-full rounded border border-olive-600 bg-charcoal px-2 py-1 text-sm text-cream focus:border-gold-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(photo)}
                      className="rounded bg-gold-500 px-3 py-1 text-xs font-medium text-black hover:bg-gold-400"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded bg-olive-700 px-3 py-1 text-xs text-cream hover:bg-olive-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="truncate text-sm text-cream">{photo.caption || <span className="text-olive-500">No caption</span>}</p>
                  <p className="text-xs capitalize text-olive-400">{photo.category}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => movePhoto(index, -1)}
                      disabled={index === 0}
                      className="rounded bg-olive-800 px-2 py-1 text-xs text-cream hover:bg-olive-700 disabled:opacity-30"
                      title="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => movePhoto(index, 1)}
                      disabled={index === photos.length - 1}
                      className="rounded bg-olive-800 px-2 py-1 text-xs text-cream hover:bg-olive-700 disabled:opacity-30"
                      title="Move later"
                    >
                      →
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(photo.id);
                        setEditCaption(photo.caption || '');
                        setEditCategory(photo.category);
                      }}
                      className="rounded bg-olive-700 px-2 py-1 text-xs text-cream hover:bg-olive-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleVisibility(photo)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        photo.is_visible
                          ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      }`}
                    >
                      {photo.is_visible ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => deletePhoto(photo)}
                      className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
