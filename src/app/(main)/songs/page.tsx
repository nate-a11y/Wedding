'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageEffects, AnimatedHeader } from '@/components/ui';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  submitted_by_name: string | null;
  votes: number;
  status: string;
  created_at: string;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [isEmailSet, setIsEmailSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [submitName, setSubmitName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('songs_voter_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setIsEmailSet(true);
    }
  }, []);

  const fetchSongs = useCallback(async () => {
    try {
      const url = email ? `/api/songs?voter_email=${encodeURIComponent(email)}` : '/api/songs';
      const response = await fetch(url);
      const data = await response.json();
      if (!data.error) {
        setSongs(data.songs || []);
        setUserVotes(data.userVotes || []);
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleSetEmail = () => {
    if (!email.trim() || !email.includes('@')) return;
    localStorage.setItem('songs_voter_email', email.trim().toLowerCase());
    setIsEmailSet(true);
    fetchSongs();
  };

  const handleVote = async (songId: string) => {
    if (!isEmailSet) return;
    setVoting(songId);

    const hasVoted = userVotes.includes(songId);

    try {
      const response = await fetch('/api/songs/vote', {
        method: hasVoted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, voter_email: email }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update song in list
        setSongs((prev) =>
          prev.map((s) => (s.id === songId ? { ...s, votes: data.song.votes } : s))
        );
        // Update user votes
        if (hasVoted) {
          setUserVotes((prev) => prev.filter((id) => id !== songId));
        } else {
          setUserVotes((prev) => [...prev, songId]);
        }
      }
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVoting(null);
    }
  };

  const handleSubmitSong = async () => {
    if (!newSongTitle.trim()) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSongTitle.trim(),
          artist: newSongArtist.trim() || null,
          submitted_by_email: email || null,
          submitted_by_name: submitName.trim() || null,
        }),
      });

      if (response.ok) {
        setNewSongTitle('');
        setNewSongArtist('');
        setSubmitName('');
        setShowSubmitForm(false);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter songs by search
  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort by votes
  const sortedSongs = [...filteredSongs].sort((a, b) => b.votes - a.votes);

  return (
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      <PageEffects variant="subtle" />
      <div className="container-wedding py-12 relative z-10">
        <AnimatedHeader
          title="Song Requests"
          subtitle="Playlist Requests"
          description="Vote for your favorites to help us build the perfect wedding playlist."
        />

        <div className="max-w-2xl mx-auto">
          {/* Email Gate */}
          {!isEmailSet && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-olive-700/80 bg-black/55 p-6 shadow-elegant backdrop-blur-sm mb-8"
            >
              <h3 className="text-lg font-medium text-cream mb-4">Enter your email to vote</h3>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="min-h-11 flex-1 rounded-xl border border-olive-700/80 bg-black/40 px-4 py-2 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleSetEmail()}
                />
                <button
                  onClick={handleSetEmail}
                  className="min-h-11 rounded-xl bg-gold-500 px-6 py-2 font-semibold text-black transition-colors hover:bg-gold-400"
                >
                  Vote
                </button>
              </div>
              <p className="text-olive-300 text-sm mt-2">
                Use the same email you used for your RSVP
              </p>
            </motion.div>
          )}

          {/* Search and Submit */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="min-h-11 w-full rounded-xl border border-olive-700/80 bg-black/45 px-4 py-2 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              />
            </div>
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="min-h-11 rounded-xl border border-olive-600 bg-olive-800/80 px-4 py-2 font-medium text-cream transition-colors hover:border-gold-500/60 hover:bg-olive-700"
            >
              {showSubmitForm ? 'Cancel' : '+ Request a Song'}
            </button>
          </div>

          {/* Submit Form */}
          <AnimatePresence>
            {showSubmitForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-olive-700/80 bg-black/55 p-6 shadow-elegant backdrop-blur-sm mb-6"
              >
                <h3 className="text-lg font-medium text-cream mb-4">Request a Song</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-olive-300 mb-1">Song Title *</label>
                    <input
                      type="text"
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      placeholder="Song name"
                      className="min-h-11 w-full rounded-xl border border-olive-700/80 bg-black/40 px-4 py-2 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-olive-300 mb-1">Artist</label>
                    <input
                      type="text"
                      value={newSongArtist}
                      onChange={(e) => setNewSongArtist(e.target.value)}
                      placeholder="Artist name"
                      className="min-h-11 w-full rounded-xl border border-olive-700/80 bg-black/40 px-4 py-2 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-olive-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={submitName}
                      onChange={(e) => setSubmitName(e.target.value)}
                      placeholder="Your name"
                      className="min-h-11 w-full rounded-xl border border-olive-700/80 bg-black/40 px-4 py-2 text-cream placeholder-olive-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    />
                  </div>
                  <button
                    onClick={handleSubmitSong}
                    disabled={!newSongTitle.trim() || submitting}
                    className="min-h-11 rounded-xl bg-gold-500 px-6 py-2 font-semibold text-black transition-colors hover:bg-gold-400 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-500/20 border border-green-500 rounded-2xl p-4 mb-6 text-center"
              >
                <span className="text-green-400">✓ Song submitted! It will appear after review.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-olive-400">Loading playlist...</p>
            </div>
          )}

          {/* Songs List */}
          {!loading && (
            <div className="space-y-3">
              {sortedSongs.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-olive-700/80 bg-black/45 shadow-elegant backdrop-blur-sm">
                  <p className="text-olive-300">
                    {searchQuery ? 'No songs match your search.' : 'No songs in the playlist yet.'}
                  </p>
                </div>
              ) : (
                sortedSongs.map((song, index) => {
                  const hasVoted = userVotes.includes(song.id);
                  const isTop3 = index < 3;

                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 rounded-2xl border ${
                        isTop3 ? 'bg-gold-500/10 border-gold-500/50' : 'bg-black/45 border-olive-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            isTop3 ? 'bg-gold-500 text-black' : 'bg-olive-700 text-cream'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-cream font-medium truncate">
                            {song.title}
                            {isTop3 && <span className="ml-2">🔥</span>}
                          </p>
                          {song.artist && (
                            <p className="text-olive-300 text-sm truncate">{song.artist}</p>
                          )}
                          {song.submitted_by_name && (
                            <p className="text-olive-300/75 text-xs">
                              Requested by {song.submitted_by_name.split(' ')[0]}
                            </p>
                          )}
                        </div>

                        {/* Vote Button */}
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-medium ${hasVoted ? 'text-gold-400' : 'text-olive-300'}`}>
                            {song.votes}
                          </span>
                          <button
                            onClick={() => handleVote(song.id)}
                            disabled={!isEmailSet || voting === song.id}
                            className={`p-2 rounded-lg transition-colors ${
                              hasVoted
                                ? 'bg-gold-500/20 text-gold-400'
                                : 'bg-olive-700 text-olive-300 hover:bg-olive-600 hover:text-cream'
                            } disabled:opacity-50`}
                            title={!isEmailSet ? 'Enter email to vote' : hasVoted ? 'Remove vote' : 'Vote'}
                          >
                            {voting === song.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : hasVoted ? (
                              '❤️'
                            ) : (
                              '🤍'
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Email reminder */}
          {isEmailSet && (
            <p className="text-center text-olive-300/75 text-xs mt-8">
              Voting as {email} •{' '}
              <button
                onClick={() => {
                  localStorage.removeItem('songs_voter_email');
                  setIsEmailSet(false);
                  setEmail('');
                  setUserVotes([]);
                }}
                className="underline hover:text-olive-400"
              >
                Change
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
