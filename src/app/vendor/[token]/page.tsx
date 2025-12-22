'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  location_notes: string | null;
  responsible_person: string | null;
  participants: string | null;
  category: string;
  is_milestone: boolean;
  color: string | null;
  notes: string | null;
  staff_notes: string | null;
  vendor_id: string | null;
}

interface VenueInfo {
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  parkingNotes: string;
  loadInNotes: string;
  wifiNetwork: string;
  wifiPassword: string;
  notes: string;
}

interface VendorData {
  vendor: {
    name: string;
    role: string;
  };
  timeline: TimelineEvent[];
  venue: VenueInfo;
  wedding: {
    date: string;
    coupleName: string;
    guestCount: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  preparation: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ceremony: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
  cocktail_hour: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  reception: 'bg-green-500/20 text-green-400 border-green-500/30',
  photos: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  transportation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  vendor_arrival: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-olive-500/20 text-olive-400 border-olive-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  preparation: 'Preparation',
  ceremony: 'Ceremony',
  cocktail_hour: 'Cocktail Hour',
  reception: 'Reception',
  photos: 'Photography',
  transportation: 'Transportation',
  vendor_arrival: 'Vendor Arrival',
  other: 'Other',
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
}

export default function VendorPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'venue'>('timeline');
  const [showStaffNotes, setShowStaffNotes] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/vendor/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to load portal');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Failed to connect to server');
        console.error('Vendor portal error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-olive-400">Loading vendor portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-cream mb-2">Access Denied</h1>
          <p className="text-olive-400">{error}</p>
          <p className="text-olive-500 text-sm mt-4">
            If you believe this is an error, please contact the couple.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const weddingDate = new Date(data.wedding.date);
  const formattedDate = weddingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="bg-charcoal-light border-b border-olive-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display text-gold-400">Vendor Portal</h1>
              <p className="text-olive-400 text-sm">
                {data.vendor.name} • {data.vendor.role}
              </p>
            </div>
            <div className="text-right">
              <p className="text-cream font-medium">{data.wedding.coupleName}</p>
              <p className="text-olive-400 text-sm">{formattedDate}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'bg-gold-500 text-black'
                : 'bg-olive-700 text-cream hover:bg-olive-600'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('venue')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'venue'
                ? 'bg-gold-500 text-black'
                : 'bg-olive-700 text-cream hover:bg-olive-600'
            }`}
          >
            Venue Info
          </button>
        </div>

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-cream">Day-of Schedule</h2>
              <label className="flex items-center gap-2 text-sm text-olive-300">
                <input
                  type="checkbox"
                  checked={showStaffNotes}
                  onChange={(e) => setShowStaffNotes(e.target.checked)}
                  className="rounded bg-charcoal border-olive-600"
                />
                Show staff notes
              </label>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {data.timeline.length === 0 ? (
                <div className="text-center py-12 bg-charcoal-light rounded-lg border border-olive-700">
                  <p className="text-olive-400">No schedule events yet.</p>
                </div>
              ) : (
                data.timeline.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`bg-charcoal-light rounded-lg p-4 border ${
                      event.is_milestone
                        ? 'border-gold-500/50 bg-gold-500/5'
                        : 'border-olive-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Time */}
                      <div className="flex-shrink-0 w-20 text-right">
                        <p className="text-cream font-medium">{formatTime(event.start_time)}</p>
                        {event.end_time && (
                          <p className="text-olive-500 text-sm">to {formatTime(event.end_time)}</p>
                        )}
                        {event.duration_minutes && !event.end_time && (
                          <p className="text-olive-500 text-xs">{event.duration_minutes} min</p>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-cream">
                            {event.is_milestone && '⭐ '}
                            {event.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded border ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other}`}>
                            {CATEGORY_LABELS[event.category] || event.category}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-olive-300 text-sm mb-2">{event.description}</p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {event.location && (
                            <span className="text-olive-400">
                              📍 {event.location}
                              {event.location_notes && (
                                <span className="text-olive-500 ml-1">({event.location_notes})</span>
                              )}
                            </span>
                          )}
                          {event.responsible_person && (
                            <span className="text-olive-400">
                              👤 {event.responsible_person}
                            </span>
                          )}
                          {event.participants && (
                            <span className="text-olive-400">
                              👥 {event.participants}
                            </span>
                          )}
                        </div>

                        {/* Notes */}
                        {event.notes && (
                          <p className="text-olive-400 text-sm mt-2 italic">
                            Note: {event.notes}
                          </p>
                        )}

                        {/* Staff Notes (highlighted) */}
                        {showStaffNotes && event.staff_notes && (
                          <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
                            <span className="text-orange-400 font-medium">Staff Note:</span>{' '}
                            <span className="text-orange-300">{event.staff_notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Venue Tab */}
        {activeTab === 'venue' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Venue Details */}
            <div className="bg-charcoal-light rounded-lg p-6 border border-olive-700">
              <h2 className="text-lg font-medium text-cream mb-4">Venue</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gold-400 font-medium text-lg">{data.venue.name}</p>
                  <p className="text-olive-300">{data.venue.address}</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-charcoal-light rounded-lg p-6 border border-olive-700">
              <h2 className="text-lg font-medium text-cream mb-4">Venue Contact</h2>
              <div className="space-y-2">
                <p className="text-cream">{data.venue.contactName}</p>
                <p className="text-olive-300">
                  <a href={`tel:${data.venue.contactPhone}`} className="hover:text-gold-400">
                    📞 {data.venue.contactPhone}
                  </a>
                </p>
                <p className="text-olive-300">
                  <a href={`mailto:${data.venue.contactEmail}`} className="hover:text-gold-400">
                    ✉️ {data.venue.contactEmail}
                  </a>
                </p>
              </div>
            </div>

            {/* Logistics */}
            <div className="bg-charcoal-light rounded-lg p-6 border border-olive-700">
              <h2 className="text-lg font-medium text-cream mb-4">Logistics</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-gold-400 text-sm font-medium mb-1">Parking</h3>
                  <p className="text-olive-300 text-sm">{data.venue.parkingNotes}</p>
                </div>
                <div>
                  <h3 className="text-gold-400 text-sm font-medium mb-1">Load-In</h3>
                  <p className="text-olive-300 text-sm">{data.venue.loadInNotes}</p>
                </div>
                {data.venue.notes && (
                  <div>
                    <h3 className="text-gold-400 text-sm font-medium mb-1">Additional Notes</h3>
                    <p className="text-olive-300 text-sm">{data.venue.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* WiFi */}
            <div className="bg-charcoal-light rounded-lg p-6 border border-olive-700">
              <h2 className="text-lg font-medium text-cream mb-4">WiFi Access</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-olive-400 text-sm">Network</p>
                  <p className="text-cream font-mono">{data.venue.wifiNetwork}</p>
                </div>
                <div>
                  <p className="text-olive-400 text-sm">Password</p>
                  <p className="text-cream font-mono">{data.venue.wifiPassword}</p>
                </div>
              </div>
            </div>

            {/* Wedding Summary */}
            <div className="bg-charcoal-light rounded-lg p-6 border border-olive-700">
              <h2 className="text-lg font-medium text-cream mb-4">Event Summary</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-olive-400">Couple</p>
                  <p className="text-cream">{data.wedding.coupleName}</p>
                </div>
                <div>
                  <p className="text-olive-400">Date</p>
                  <p className="text-cream">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-olive-400">Expected Guests</p>
                  <p className="text-cream">{data.wedding.guestCount}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-olive-500 text-sm">
        <p>This portal is for vendor use only. Do not share this link.</p>
      </footer>
    </div>
  );
}
