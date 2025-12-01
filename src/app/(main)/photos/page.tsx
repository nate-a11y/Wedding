'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Photo {
  id: string;
  guest_name: string;
  caption: string | null;
  url: string;
  created_at: string;
  source?: 'camera' | 'upload';
}

interface PendingUpload {
  file: File;
  preview: string;
  source: 'camera' | 'upload';
  caption: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const UPLOAD_LIMIT = 100;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.') + ' ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [userPhotoCount, setUserPhotoCount] = useState(0);

  // Multi-upload state
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalCaption, setGlobalCaption] = useState('');

  // Slideshow state
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing photos
  useEffect(() => {
    async function fetchPhotos() {
      try {
        const response = await fetch('/api/photos');
        const data = await response.json();
        if (data.photos) {
          setPhotos(data.photos);
        }
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPhotos();
  }, []);

  // Update user photo count when photos or guestName changes
  useEffect(() => {
    if (guestName.trim()) {
      const count = photos.filter(
        (p) => p.guest_name.toLowerCase() === guestName.trim().toLowerCase()
      ).length;
      setUserPhotoCount(count);
    } else {
      setUserPhotoCount(0);
    }
  }, [photos, guestName]);

  // Slideshow logic
  const startSlideshow = useCallback(() => {
    if (photos.length === 0) return;
    setSlideshowActive(true);
    setSlideshowIndex(0);
  }, [photos.length]);

  const stopSlideshow = useCallback(() => {
    setSlideshowActive(false);
    if (slideshowRef.current) {
      clearTimeout(slideshowRef.current);
      slideshowRef.current = null;
    }
  }, []);

  const nextSlide = useCallback(() => {
    setSlideshowIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevSlide = useCallback(() => {
    setSlideshowIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Auto-advance slideshow
  useEffect(() => {
    if (slideshowActive && photos.length > 0) {
      slideshowRef.current = setTimeout(() => {
        nextSlide();
      }, 5000);
      return () => {
        if (slideshowRef.current) {
          clearTimeout(slideshowRef.current);
        }
      };
    }
  }, [slideshowActive, slideshowIndex, photos.length, nextSlide]);

  // Keyboard navigation for slideshow
  useEffect(() => {
    if (!slideshowActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopSlideshow();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideshowActive, stopSlideshow, nextSlide, prevSlide]);

  // Handle camera capture (single file)
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newUpload: PendingUpload = {
        file,
        preview: URL.createObjectURL(file),
        source: 'camera',
        caption: '',
        status: 'pending',
      };
      setPendingUploads((prev) => [...prev, newUpload]);
      setError(null);
    }
    // Reset input
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Handle file upload (multiple files)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newUploads: PendingUpload[] = Array.from(files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        source: 'upload' as const,
        caption: '',
        status: 'pending' as const,
      }));
      setPendingUploads((prev) => [...prev, ...newUploads]);
      setError(null);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUpload = (index: number) => {
    setPendingUploads((prev) => {
      const newUploads = [...prev];
      URL.revokeObjectURL(newUploads[index].preview);
      newUploads.splice(index, 1);
      return newUploads;
    });
  };

  const updateUploadCaption = (index: number, caption: string) => {
    setPendingUploads((prev) => {
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], caption };
      return newUploads;
    });
  };

  const clearAllUploads = () => {
    pendingUploads.forEach((u) => URL.revokeObjectURL(u.preview));
    setPendingUploads([]);
    setGlobalCaption('');
  };

  const handleUploadAll = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    const pendingCount = pendingUploads.filter((u) => u.status === 'pending').length;
    if (pendingCount === 0) {
      setError('No photos to upload');
      return;
    }

    // Check upload limit
    if (userPhotoCount + pendingCount > UPLOAD_LIMIT) {
      setError(`You can only upload ${UPLOAD_LIMIT - userPhotoCount} more photo${UPLOAD_LIMIT - userPhotoCount !== 1 ? 's' : ''}`);
      return;
    }

    setError(null);
    setIsUploading(true);

    const uploadPromises = pendingUploads.map(async (upload, index) => {
      if (upload.status !== 'pending') return null;

      // Mark as uploading
      setPendingUploads((prev) => {
        const newUploads = [...prev];
        newUploads[index] = { ...newUploads[index], status: 'uploading' };
        return newUploads;
      });

      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('guestName', guestName.trim());
        formData.append('source', upload.source);

        // Use individual caption or global caption
        const caption = upload.caption.trim() || globalCaption.trim();
        if (caption) {
          formData.append('caption', caption);
        }

        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload');
        }

        // Mark as success
        setPendingUploads((prev) => {
          const newUploads = [...prev];
          newUploads[index] = { ...newUploads[index], status: 'success' };
          return newUploads;
        });

        return data.photo;
      } catch (err) {
        // Mark as error
        setPendingUploads((prev) => {
          const newUploads = [...prev];
          newUploads[index] = {
            ...newUploads[index],
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          };
          return newUploads;
        });
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulPhotos = results.filter((p): p is Photo => p !== null);

    if (successfulPhotos.length > 0) {
      setPhotos((prev) => [...successfulPhotos, ...prev]);
      setSuccess(true);
      localStorage.setItem('wedding-guest-name', guestName);
      setTimeout(() => setSuccess(false), 4000);
    }

    // Clean up successful uploads after a delay
    setTimeout(() => {
      setPendingUploads((prev) => {
        const remaining = prev.filter((u) => u.status !== 'success');
        // Revoke URLs for removed items
        prev.filter((u) => u.status === 'success').forEach((u) => URL.revokeObjectURL(u.preview));
        return remaining;
      });
      if (pendingUploads.every((u) => u.status === 'success' || u.status === 'error')) {
        setGlobalCaption('');
      }
    }, 1500);

    setIsUploading(false);
  };

  // Load saved guest name
  useEffect(() => {
    const savedName = localStorage.getItem('wedding-guest-name');
    if (savedName) {
      setGuestName(savedName);
    }
  }, []);

  const remainingUploads = UPLOAD_LIMIT - userPhotoCount;

  return (
    <div className="section-padding bg-charcoal">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="font-accent text-3xl text-gold-500 mb-4">Capture the Moment</p>
          <h1 className="font-heading text-4xl md:text-5xl text-cream mb-6">
            Photo Booth
          </h1>
          <div className="gold-line mx-auto mb-8" />
          <p className="text-olive-300 max-w-2xl mx-auto text-lg">
            Share your favorite moments from our celebration! Take a photo with the retro filter
            or upload existing photos to add them to our shared gallery.
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 md:p-8">
            {/* Name Input */}
            <div className="mb-6">
              <Input
                label="Your Name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                maxLength={100}
              />
              {guestName.trim() && (
                <p className="text-olive-400 text-xs mt-2">
                  {remainingUploads > 0
                    ? `${remainingUploads} photo${remainingUploads !== 1 ? 's' : ''} remaining`
                    : 'Upload limit reached'}
                </p>
              )}
            </div>

            {/* Camera/Upload Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={remainingUploads <= 0 && guestName.trim() !== ''}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-olive-600 rounded-lg hover:border-gold-500 hover:bg-olive-900/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-olive-600 disabled:hover:bg-transparent"
              >
                <svg
                  className="w-10 h-10 text-olive-400 group-hover:text-gold-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-olive-300 group-hover:text-cream text-sm font-medium transition-colors">
                  Take Photo
                </span>
                <span className="text-olive-500 text-xs">with retro filter</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={remainingUploads <= 0 && guestName.trim() !== ''}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-olive-600 rounded-lg hover:border-gold-500 hover:bg-olive-900/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-olive-600 disabled:hover:bg-transparent"
              >
                <svg
                  className="w-10 h-10 text-olive-400 group-hover:text-gold-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-olive-300 group-hover:text-cream text-sm font-medium transition-colors">
                  Upload Photos
                </span>
                <span className="text-olive-500 text-xs">select multiple</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Pending Uploads Grid */}
            {pendingUploads.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-cream font-medium">
                    {pendingUploads.length} photo{pendingUploads.length !== 1 ? 's' : ''} ready
                  </h3>
                  <button
                    onClick={clearAllUploads}
                    className="text-olive-400 hover:text-red-400 text-sm transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {pendingUploads.map((upload, index) => (
                    <div
                      key={index}
                      className={`relative rounded-lg overflow-hidden ${
                        upload.source === 'camera' ? 'retro-photo' : ''
                      }`}
                    >
                      <img
                        src={upload.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />

                      {/* Source badge */}
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium z-20 ${
                        upload.source === 'camera'
                          ? 'bg-gold-500 text-black'
                          : 'bg-olive-700 text-cream'
                      }`}>
                        {upload.source === 'camera' ? 'Retro' : 'Upload'}
                      </div>

                      {/* Status overlay */}
                      {upload.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {upload.status === 'success' && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center z-20">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {upload.status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center z-20">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}

                      {/* Remove button */}
                      {upload.status === 'pending' && (
                        <button
                          onClick={() => removeUpload(index)}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-black transition-colors z-20"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Global Caption */}
                <div className="mb-6">
                  <Input
                    label="Caption for all (optional)"
                    value={globalCaption}
                    onChange={(e) => setGlobalCaption(e.target.value)}
                    placeholder="Add a caption for all photos..."
                    maxLength={200}
                  />
                </div>

                {/* Error/Success Messages */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-md"
                    >
                      <p className="text-red-400 text-sm">{error}</p>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-4 bg-olive-500/10 border border-olive-500/50 rounded-md"
                    >
                      <p className="text-olive-300 text-sm">Photos uploaded successfully!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Button */}
                <Button
                  onClick={handleUploadAll}
                  isLoading={isUploading}
                  className="w-full"
                  disabled={!guestName.trim() || pendingUploads.filter((u) => u.status === 'pending').length === 0}
                >
                  Share {pendingUploads.filter((u) => u.status === 'pending').length} Photo{pendingUploads.filter((u) => u.status === 'pending').length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-2xl text-cream">
              Gallery
            </h2>
            {photos.length > 0 && (
              <button
                onClick={startSlideshow}
                className="flex items-center gap-2 px-4 py-2 bg-olive-700/50 hover:bg-olive-700 text-cream rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Slideshow</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
              <p className="text-olive-400 mt-4">Loading photos...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 bg-black/30 border border-olive-700 rounded-lg max-w-md mx-auto">
              <svg
                className="w-16 h-16 mx-auto text-olive-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-olive-400 text-lg">
                No photos yet. Be the first to share!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className={`relative group cursor-pointer aspect-square ${
                    photo.source === 'camera' ? 'retro-photo' : ''
                  }`}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={`Photo by ${photo.guest_name}`}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                  {/* Disposable camera style timestamp - only for camera photos */}
                  {photo.source === 'camera' && (
                    <div className="absolute bottom-2 right-2 photo-timestamp z-20">
                      {formatTimestamp(photo.created_at)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-lg flex items-end z-15">
                    <div className="p-3 opacity-0 group-hover:opacity-100 transition-opacity w-full">
                      <p className="text-white text-sm font-medium truncate">{photo.guest_name}</p>
                      {photo.caption && (
                        <p className="text-white/70 text-xs truncate">{photo.caption}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Lightbox */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className={`rounded-lg overflow-hidden ${selectedPhoto.source === 'camera' ? 'retro-photo' : ''}`}>
                  <img
                    src={selectedPhoto.url}
                    alt={`Photo by ${selectedPhoto.guest_name}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg z-20">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white font-medium">{selectedPhoto.guest_name}</p>
                      {selectedPhoto.caption && (
                        <p className="text-white/70 text-sm mt-1">{selectedPhoto.caption}</p>
                      )}
                      <p className="text-white/50 text-xs mt-2">{formatDate(selectedPhoto.created_at)}</p>
                    </div>
                    {selectedPhoto.source === 'camera' && (
                      <div className="photo-timestamp">
                        {formatTimestamp(selectedPhoto.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slideshow Modal */}
        <AnimatePresence>
          {slideshowActive && photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            >
              {/* Film grain overlay for slideshow - only for camera photos */}
              {photos[slideshowIndex]?.source === 'camera' && (
                <div className="absolute inset-0 film-grain pointer-events-none" />
              )}

              {/* Current slide */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideshowIndex}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                  className="relative w-full h-full flex items-center justify-center p-8"
                >
                  <div className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center">
                    <div className={`rounded-lg overflow-hidden ${
                      photos[slideshowIndex]?.source === 'camera' ? 'retro-photo ken-burns' : 'ken-burns'
                    }`}>
                      <img
                        src={photos[slideshowIndex].url}
                        alt={`Photo by ${photos[slideshowIndex].guest_name}`}
                        className="max-w-full max-h-[80vh] object-contain"
                      />
                    </div>
                    {/* Photo info overlay */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute bottom-4 left-4 right-4 p-4 bg-black/60 backdrop-blur-sm rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium text-lg">{photos[slideshowIndex].guest_name}</p>
                          {photos[slideshowIndex].caption && (
                            <p className="text-white/70 mt-1">{photos[slideshowIndex].caption}</p>
                          )}
                        </div>
                        {photos[slideshowIndex]?.source === 'camera' && (
                          <div className="photo-timestamp text-base">
                            {formatTimestamp(photos[slideshowIndex].created_at)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Slideshow controls */}
              <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
                <span className="text-white/60 text-sm">
                  {slideshowIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={stopSlideshow}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Progress dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {photos.slice(0, Math.min(photos.length, 20)).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSlideshowIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === slideshowIndex
                        ? 'bg-gold-500 w-6'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
                {photos.length > 20 && (
                  <span className="text-white/50 text-xs ml-2">+{photos.length - 20}</span>
                )}
              </div>

              {/* Instructions */}
              <div className="absolute top-4 left-4 text-white/40 text-xs">
                Use arrow keys to navigate • ESC to exit
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
