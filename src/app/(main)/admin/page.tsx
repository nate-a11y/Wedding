'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Stats {
  rsvps: {
    total: number;
    attending: number;
    notAttending: number;
    plusOnes: number;
    additionalGuests?: number;
    children?: number;
    totalGuests: number;
  };
  guestbook: number;
  photos: number;
}

interface AdditionalGuest {
  name: string;
  mealChoice: string;
  isChild: boolean;
}

interface RSVP {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  additional_guests: AdditionalGuest[] | null;
  plus_one: boolean;
  plus_one_name: string | null;
  plus_one_meal_choice: string | null;
  song_request: string | null;
  message: string | null;
  created_at: string;
}

interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

interface Photo {
  id: string;
  guest_name: string;
  file_path: string;
  caption: string | null;
  is_visible: boolean;
  source: string;
  url: string;
  created_at: string;
}

interface Email {
  id: string;
  resend_id: string | null;
  direction: 'outbound' | 'inbound';
  from_address: string;
  to_address: string;
  subject: string | null;
  status: string;
  email_type: string | null;
  related_id: string | null;
  created_at: string;
}

type Tab = 'overview' | 'rsvps' | 'guestbook' | 'photos' | 'emails';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'rsvps') {
          const response = await fetch('/api/admin/rsvps');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setRsvps(data.rsvps);
        } else if (activeTab === 'guestbook') {
          const response = await fetch('/api/admin/guestbook');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setGuestbook(data.entries);
        } else if (activeTab === 'photos') {
          const response = await fetch('/api/admin/photos');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setPhotos(data.photos);
        } else if (activeTab === 'emails') {
          const response = await fetch('/api/admin/emails');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setEmails(data.emails);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (activeTab !== 'overview') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [activeTab]);

  const togglePhotoVisibility = async (photo: Photo) => {
    try {
      await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, is_visible: !photo.is_visible }),
      });
      setPhotos(photos.map(p =>
        p.id === photo.id ? { ...p, is_visible: !p.is_visible } : p
      ));
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await fetch('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, file_path: photo.file_path }),
      });
      setPhotos(photos.filter(p => p.id !== photo.id));
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const deleteGuestbookEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await fetch('/api/admin/guestbook', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setGuestbook(guestbook.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const deleteRsvp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this RSVP?')) return;
    try {
      await fetch('/api/admin/rsvps', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setRsvps(rsvps.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete RSVP:', err);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'rsvps',
      label: 'RSVPs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'guestbook',
      label: 'Guestbook',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'emails',
      label: 'Emails',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="section-padding bg-charcoal min-h-screen">
      <div className="container-wedding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="font-accent text-3xl text-gold-500 mb-2">Wedding</p>
          <h1 className="font-heading text-4xl text-cream">Admin Dashboard</h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gold-500 text-black'
                  : 'bg-olive-800/50 text-olive-300 hover:bg-olive-700/50'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-gold-500 mb-2">
                  {stats?.rsvps.totalGuests || 0}
                </div>
                <div className="text-olive-300">Total Guests</div>
                <div className="text-olive-500 text-sm mt-1">
                  {stats?.rsvps.attending || 0} RSVPs + {stats?.rsvps.additionalGuests || stats?.rsvps.plusOnes || 0} guests
                </div>
              </div>

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-green-500 mb-2">
                  {stats?.rsvps.attending || 0}
                </div>
                <div className="text-olive-300">Attending</div>
              </div>

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-red-400 mb-2">
                  {stats?.rsvps.notAttending || 0}
                </div>
                <div className="text-olive-300">Not Attending</div>
              </div>

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-cream mb-2">
                  {stats?.rsvps.total || 0}
                </div>
                <div className="text-olive-300">Total RSVPs</div>
              </div>

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-purple-400 mb-2">
                  {stats?.guestbook || 0}
                </div>
                <div className="text-olive-300">Guestbook Entries</div>
              </div>

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-blue-400 mb-2">
                  {stats?.photos || 0}
                </div>
                <div className="text-olive-300">Photos Uploaded</div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rsvps' && (
            <motion.div
              key="rsvps"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : rsvps.length === 0 ? (
                <div className="text-center py-12 text-olive-400">No RSVPs yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-olive-700">
                        <th className="p-3 text-olive-300 font-medium">Name</th>
                        <th className="p-3 text-olive-300 font-medium">Email</th>
                        <th className="p-3 text-olive-300 font-medium">Status</th>
                        <th className="p-3 text-olive-300 font-medium">Meal</th>
                        <th className="p-3 text-olive-300 font-medium">Party</th>
                        <th className="p-3 text-olive-300 font-medium">Date</th>
                        <th className="p-3 text-olive-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rsvps.map((rsvp) => {
                        const guests = rsvp.additional_guests || [];
                        const partySize = 1 + guests.length;
                        const childCount = guests.filter(g => g.isChild).length;
                        return (
                          <tr key={rsvp.id} className="border-b border-olive-800 hover:bg-olive-900/30">
                            <td className="p-3 text-cream">
                              {rsvp.name}
                              {guests.length > 0 && (
                                <div className="text-xs text-olive-500 mt-1">
                                  +{guests.map(g => g.name).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-olive-400">{rsvp.email}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                rsvp.attending ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {rsvp.attending ? 'Attending' : 'Not Attending'}
                              </span>
                            </td>
                            <td className="p-3 text-olive-400 capitalize">{rsvp.meal_choice || '-'}</td>
                            <td className="p-3 text-olive-400">
                              {partySize}
                              {childCount > 0 && (
                                <span className="text-xs text-gold-400 ml-1">
                                  ({childCount} {childCount === 1 ? 'child' : 'children'})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-olive-500 text-sm">{formatDate(rsvp.created_at)}</td>
                            <td className="p-3">
                              <button
                                onClick={() => deleteRsvp(rsvp.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete RSVP"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'guestbook' && (
            <motion.div
              key="guestbook"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : guestbook.length === 0 ? (
                <div className="text-center py-12 text-olive-400">No guestbook entries yet</div>
              ) : (
                guestbook.map((entry) => (
                  <div key={entry.id} className="bg-black/50 border border-olive-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-cream font-medium">{entry.name}</p>
                        <p className="text-olive-300 mt-1">{entry.message}</p>
                        <p className="text-olive-500 text-sm mt-2">{formatDate(entry.created_at)}</p>
                      </div>
                      <button
                        onClick={() => deleteGuestbookEntry(entry.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12 text-olive-400">No photos uploaded yet</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className={`aspect-square rounded-lg overflow-hidden ${!photo.is_visible ? 'opacity-50' : ''}`}>
                        <img
                          src={photo.url}
                          alt={`Photo by ${photo.guest_name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => togglePhotoVisibility(photo)}
                          className={`p-2 rounded-full ${photo.is_visible ? 'bg-yellow-500' : 'bg-green-500'} text-white`}
                          title={photo.is_visible ? 'Hide' : 'Show'}
                        >
                          {photo.is_visible ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => deletePhoto(photo)}
                          className="p-2 rounded-full bg-red-500 text-white"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2">
                        <p className="text-cream text-sm truncate">{photo.guest_name}</p>
                        <p className="text-olive-500 text-xs">{formatDate(photo.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'emails' && (
            <motion.div
              key="emails"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12 text-olive-400">No emails sent yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-olive-700">
                        <th className="p-3 text-olive-300 font-medium">Direction</th>
                        <th className="p-3 text-olive-300 font-medium">To</th>
                        <th className="p-3 text-olive-300 font-medium">Subject</th>
                        <th className="p-3 text-olive-300 font-medium">Type</th>
                        <th className="p-3 text-olive-300 font-medium">Status</th>
                        <th className="p-3 text-olive-300 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((email) => (
                        <tr key={email.id} className="border-b border-olive-800 hover:bg-olive-900/30">
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              email.direction === 'outbound'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {email.direction === 'outbound' ? 'Sent' : 'Received'}
                            </span>
                          </td>
                          <td className="p-3 text-cream">{email.to_address}</td>
                          <td className="p-3 text-olive-300 max-w-xs truncate">{email.subject || '-'}</td>
                          <td className="p-3 text-olive-400 capitalize">{email.email_type?.replace(/_/g, ' ') || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              email.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                              email.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                              email.status === 'opened' ? 'bg-purple-500/20 text-purple-400' :
                              email.status === 'bounced' ? 'bg-red-500/20 text-red-400' :
                              email.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-olive-500/20 text-olive-400'
                            }`}>
                              {email.status}
                            </span>
                          </td>
                          <td className="p-3 text-olive-500 text-sm">{formatDate(email.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
