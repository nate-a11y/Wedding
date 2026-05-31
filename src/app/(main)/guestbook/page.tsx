'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageEffects, AnimatedHeader } from '@/components/ui';

interface GuestBookEntry {
  id: string;
  name: string;
  message: string | null;
  media_url: string | null;
  media_type: 'video' | 'audio' | null;
  media_duration: number | null;
  created_at: string;
}

type MessageType = 'text' | 'video' | 'audio';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function looksLikeVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(webm|mp4|mov)$/i.test(file.name);
}

function looksLikeAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(webm|mp3|m4a|aac|wav)$/i.test(file.name);
}

function preferredRecorderMime(type: MessageType): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = type === 'video'
    ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function GuestBookPage() {
  const [entries, setEntries] = useState<GuestBookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>('text');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  // Media recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Fetch existing entries
  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await fetch('/api/guestbook');
        const data = await response.json();
        if (data.entries) {
          setEntries(data.entries);
        }
      } catch (err) {
        console.error('Failed to fetch guest book entries:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntries();
  }, []);

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl, stopRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      const constraints = messageType === 'video'
        ? { video: true, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show live preview for video
      if (messageType === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorderMimeType = preferredRecorderMime(messageType);
      const mediaRecorder = new MediaRecorder(
        stream,
        recorderMimeType ? { mimeType: recorderMimeType } : undefined
      );

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || (messageType === 'video' ? 'video/webm' : 'audio/webm')
        });
        setRecordedBlob(blob);

        // Create preview URL
        const url = URL.createObjectURL(blob);
        setMediaPreviewUrl(url);

        // Stop live preview
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at 120 seconds
          if (newTime >= 120) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not access camera/microphone. Please check your permissions.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type and size before previewing
    const isVideo = looksLikeVideoFile(file);
    const isAudio = looksLikeAudioFile(file);

    if (!isVideo && !isAudio) {
      setError('Please upload a valid video or audio file.');
      return;
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
    if (file.size > maxBytes) {
      setError(`${isVideo ? 'Video' : 'Audio'} must be ${formatFileSize(maxBytes)} or smaller.`);
      return;
    }

    // Set appropriate message type
    setMessageType(isVideo ? 'video' : 'audio');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);
    setRecordedBlob(file);

    // Get duration
    const mediaElement = isVideo
      ? document.createElement('video')
      : document.createElement('audio');

    mediaElement.src = url;
    mediaElement.onloadedmetadata = () => {
      const duration = Math.floor(mediaElement.duration);
      if (duration > 120) {
        setError('Media must be 120 seconds or less.');
        setRecordedBlob(null);
        setMediaPreviewUrl(null);
        URL.revokeObjectURL(url);
      } else {
        setRecordingTime(duration);
      }
    };
  };

  const clearRecording = () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setRecordedBlob(null);
    setMediaPreviewUrl(null);
    setRecordingTime(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    let uploadedMediaPath: string | null = null;

    try {
      // Upload media through the server so storage writes are validated and private to the API.
      if (recordedBlob && messageType !== 'text') {
        const maxBytes = messageType === 'video' ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
        if (recordedBlob.size > maxBytes) {
          throw new Error(`${messageType === 'video' ? 'Video' : 'Audio'} must be ${formatFileSize(maxBytes)} or smaller.`);
        }

        const mediaFormData = new FormData();
        mediaFormData.append('file', recordedBlob);
        mediaFormData.append('media_type', messageType);
        mediaFormData.append('media_duration', String(recordingTime));

        const mediaResponse = await fetch('/api/guestbook/media', {
          method: 'POST',
          body: mediaFormData,
        });
        const mediaData = await mediaResponse.json();

        if (!mediaResponse.ok) {
          throw new Error(mediaData.error || 'Failed to upload media');
        }

        uploadedMediaPath = mediaData.media?.path || null;
      }

      // Submit guestbook entry
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          message: messageType === 'text' ? formData.message : null,
          media_path: uploadedMediaPath,
          media_type: uploadedMediaPath && messageType !== 'text' ? messageType : null,
          media_duration: uploadedMediaPath && recordingTime > 0 ? recordingTime : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Add the new entry to the list
      if (data.entry) {
        setEntries((prev) => [data.entry, ...prev]);
      }

      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      clearRecording();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      if (uploadedMediaPath) {
        fetch('/api/guestbook/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: uploadedMediaPath, media_type: messageType }),
        }).catch((cleanupError) => {
          console.error('Failed to clean up uploaded guestbook media:', cleanupError);
        });
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="section-padding bg-charcoal relative overflow-hidden">
      {/* Animated background effects */}
      <PageEffects variant="subtle" showRings={false} />

      <div className="container-wedding relative z-10">
        {/* Header */}
        <AnimatedHeader
          subtitle="Sign Our"
          title="Guest Book"
          description="Leave us a message, share your wishes, record a video, or send us a voice note!"
        />

        <div className="max-w-4xl mx-auto">
          {/* Sign Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6 md:p-8 mb-12"
          >
            <h2 className="font-heading text-2xl text-cream mb-6">
              Leave a Message
            </h2>

            {/* Message Type Selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setMessageType('text');
                  clearRecording();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  messageType === 'text'
                    ? 'bg-gold-500 text-black font-medium'
                    : 'bg-olive-800 text-olive-300 hover:bg-olive-700'
                }`}
              >
                ✍️ Text Message
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessageType('video');
                  clearRecording();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  messageType === 'video'
                    ? 'bg-gold-500 text-black font-medium'
                    : 'bg-olive-800 text-olive-300 hover:bg-olive-700'
                }`}
              >
                🎥 Video Message
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessageType('audio');
                  clearRecording();
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  messageType === 'audio'
                    ? 'bg-gold-500 text-black font-medium'
                    : 'bg-olive-800 text-olive-300 hover:bg-olive-700'
                }`}
              >
                🎙️ Audio Message
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                required
                maxLength={100}
              />

              <Input
                label="Your Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                maxLength={255}
              />

              {/* Text Message */}
              {messageType === 'text' && (
                <div className="w-full">
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-medium text-cream"
                  >
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Share your wishes, memories, or just say hello..."
                    required
                    maxLength={500}
                    rows={4}
                    className="flex w-full rounded-md border border-olive-600 bg-charcoal text-cream px-4 py-3 text-base transition-colors placeholder:text-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                  <p className="mt-1.5 text-sm text-olive-400">
                    {formData.message.length}/500 characters
                  </p>
                </div>
              )}

              {/* Video/Audio Recording */}
              {messageType !== 'text' && (
                <div className="w-full space-y-4">
                  <label className="block text-sm font-medium text-cream">
                    {messageType === 'video' ? 'Video' : 'Audio'} Message (Max 120 seconds)
                  </label>

                  {!recordedBlob && !isRecording && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-full px-4 py-3 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="8" />
                        </svg>
                        Start Recording
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-olive-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-black/50 text-olive-400">or</span>
                        </div>
                      </div>

                      <label className="block">
                        <input
                          type="file"
                          accept={messageType === 'video' ? 'video/*' : 'audio/*'}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-full px-4 py-3 bg-olive-800 text-olive-300 rounded-lg hover:bg-olive-700 transition-colors font-medium text-center cursor-pointer">
                          📁 Upload {messageType === 'video' ? 'Video' : 'Audio'} File
                        </div>
                      </label>
                    </div>
                  )}

                  {isRecording && (
                    <div className="space-y-3">
                      {messageType === 'video' && (
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          className="w-full rounded-lg bg-black aspect-video"
                        />
                      )}

                      <div className="flex items-center justify-between bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-cream font-medium">
                            Recording... {formatDuration(recordingTime)} / 2:00
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  )}

                  {recordedBlob && mediaPreviewUrl && (
                    <div className="space-y-3">
                      <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-4">
                        {messageType === 'video' ? (
                          <video
                            src={mediaPreviewUrl}
                            controls
                            className="w-full rounded-lg bg-black aspect-video"
                          />
                        ) : (
                          <audio
                            src={mediaPreviewUrl}
                            controls
                            className="w-full"
                          />
                        )}
                        <p className="text-olive-400 text-sm mt-2">
                          Duration: {formatDuration(recordingTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="w-full px-4 py-2 bg-olive-800 text-olive-300 rounded-lg hover:bg-olive-700 transition-colors font-medium"
                      >
                        🗑️ Re-record
                      </button>
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-500/10 border border-red-500/50 rounded-md"
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-olive-500/10 border border-olive-500/50 rounded-md"
                  >
                    <p className="text-olive-300 text-sm">
                      Thank you for signing our guest book!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full md:w-auto"
                disabled={
                  isRecording ||
                  (messageType !== 'text' && !recordedBlob) ||
                  (messageType === 'text' && !formData.message.trim())
                }
              >
                Sign Guest Book
              </Button>
            </form>
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="font-heading text-2xl text-cream mb-6 text-center">
              Messages from Our Guests
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                <p className="text-olive-400 mt-4">Loading messages...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 bg-black/30 border border-olive-700 rounded-lg">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p className="text-olive-400 text-lg">
                  Be the first to sign our guest book!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="bg-black/50 border border-olive-700 rounded-lg shadow-elegant p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading text-lg text-cream">
                          {entry.name}
                        </h3>
                        {entry.media_type && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded">
                            {entry.media_type === 'video' ? '🎥 Video' : '🎙️ Audio'}
                            {entry.media_duration && ` · ${formatDuration(entry.media_duration)}`}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-olive-500">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    {entry.media_url && entry.media_type === 'video' && (
                      <video
                        src={entry.media_url}
                        controls
                        className="w-full rounded-lg bg-black aspect-video mb-3"
                      />
                    )}

                    {entry.media_url && entry.media_type === 'audio' && (
                      <audio
                        src={entry.media_url}
                        controls
                        className="w-full mb-3"
                      />
                    )}

                    {entry.message && (
                      <p className="text-olive-300 whitespace-pre-wrap">
                        {entry.message}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
