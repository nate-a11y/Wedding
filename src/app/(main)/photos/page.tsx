'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Photo {
  id: string;
  guest_name: string;
  caption: string | null;
  url: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !guestName.trim()) {
      setError('Please enter your name and select a photo');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('guestName', guestName.trim());
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload');
      }

      // Add new photo to gallery
      if (data.photo) {
        setPhotos((prev) => [data.photo, ...prev]);
      }

      setSuccess(true);
      clearSelection();

      // Save guest name for future uploads
      localStorage.setItem('wedding-guest-name', guestName);

      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };

  // Load saved guest name
  useEffect(() => {
    const savedName = localStorage.getItem('wedding-guest-name');
    if (savedName) {
      setGuestName(savedName);
    }
  }, []);

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
            Share your favorite moments from our celebration! Take a photo or upload one
            to add it to our shared gallery.
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl mx-auto mb-16"
        >
          <div className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 md:p-8">
            {!previewUrl ? (
              <>
                {/* Name Input */}
                <div className="mb-6">
                  <Input
                    label="Your Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={100}
                  />
                </div>

                {/* Camera/Upload Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-olive-600 rounded-lg hover:border-gold-500 hover:bg-olive-900/30 transition-all group"
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
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-olive-600 rounded-lg hover:border-gold-500 hover:bg-olive-900/30 transition-all group"
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
                      Upload Photo
                    </span>
                  </button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            ) : (
              <>
                {/* Preview */}
                <div className="relative mb-6">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg object-cover max-h-80"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute top-2 right-2 p-2 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Caption Input */}
                <div className="mb-6">
                  <Input
                    label="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
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
                      <p className="text-olive-300 text-sm">Photo uploaded successfully!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  isLoading={isUploading}
                  className="w-full"
                  disabled={!guestName.trim()}
                >
                  Share Photo
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="font-heading text-2xl text-cream mb-8 text-center">
            Gallery
          </h2>

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
                  className="relative group cursor-pointer aspect-square"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={`Photo by ${photo.guest_name}`}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-lg flex items-end">
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
                <img
                  src={selectedPhoto.url}
                  alt={`Photo by ${selectedPhoto.guest_name}`}
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                  <p className="text-white font-medium">{selectedPhoto.guest_name}</p>
                  {selectedPhoto.caption && (
                    <p className="text-white/70 text-sm mt-1">{selectedPhoto.caption}</p>
                  )}
                  <p className="text-white/50 text-xs mt-2">{formatDate(selectedPhoto.created_at)}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
