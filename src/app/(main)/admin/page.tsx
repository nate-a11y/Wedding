'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextEditor } from '@/components/ui';
import { supabase } from '@/lib/supabase';

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
  addresses?: {
    total: number;
    linked: number;
    unlinked: number;
  };
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

interface GuestAddress {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  linked_rsvp_id: string | null;
  rsvps: {
    id: string;
    name: string;
    attending: boolean;
    created_at: string;
  } | null;
  created_at: string;
}

interface SeatingTable {
  id: string;
  name: string;
  capacity: number;
  table_type: string;
  notes: string | null;
}

interface SeatingAssignment {
  id: string;
  table_id: string;
  guest_name: string;
  rsvp_id: string | null;
  is_additional_guest: boolean;
}

interface UnassignedGuest {
  name: string;
  rsvpId: string;
  email: string;
  isAdditionalGuest: boolean;
}

// Couple Dashboard Types
interface BudgetCategory {
  id: string;
  name: string;
  estimated_amount: number;
  spent: number;
  paid: number;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

interface BudgetSettings {
  id?: string;
  total_budget: number;
  currency: string;
}

interface BudgetTotals {
  budget: number;
  estimated: number;
  spent: number;
  paid: number;
  remaining: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  amount_paid: number;
  category_id: string | null;
  vendor_id: string | null;
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  payment_date: string | null;
  payment_method: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  category?: { id: string; name: string; icon: string | null } | null;
  vendor?: { id: string; name: string } | null;
}

interface Vendor {
  id: string;
  name: string;
  category_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  contract_amount: number;
  amount_paid: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_date: string | null;
  payment_due_date: string | null;
  final_payment_date: string | null;
  notes: string | null;
  status: 'researching' | 'contacted' | 'booked' | 'paid' | 'completed' | 'cancelled';
  created_at: string;
  category?: { id: string; name: string; icon: string | null } | null;
}

interface Gift {
  id: string;
  giver_name: string;
  giver_email: string | null;
  gift_type: 'cash' | 'check' | 'item' | 'experience' | 'registry' | 'other';
  description: string | null;
  amount: number | null;
  received_date: string;
  thank_you_sent: boolean;
  thank_you_sent_date: string | null;
  linked_rsvp_id: string | null;
  notes: string | null;
  created_at: string;
  rsvp?: { id: string; name: string; email: string } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  due_date: string | null;
  completed: boolean;
  completed_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  category?: { id: string; name: string; icon: string | null } | null;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  upcoming: number;
}

interface GiftTotals {
  totalCash: number;
  totalGifts: number;
  thankYouPending: number;
}

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
  vendor_id: string | null;
  category: 'preparation' | 'ceremony' | 'cocktail_hour' | 'reception' | 'photos' | 'transportation' | 'vendor_arrival' | 'other';
  is_milestone: boolean;
  color: string | null;
  notes: string | null;
  staff_notes: string | null;
  sort_order: number;
  created_at: string;
  vendor?: { id: string; name: string; phone: string | null; email: string | null } | null;
}

interface ExpenseTotals {
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  countPending: number;
  countPartial: number;
  countPaid: number;
}

interface VendorTotals {
  totalContracted: number;
  totalPaid: number;
  totalBalance: number;
  countBooked: number;
  countPaid: number;
  countResearching: number;
}

type Tab = 'overview' | 'rsvps' | 'addresses' | 'seating' | 'guestbook' | 'photos' | 'emails' | 'planning';
type PlanningSubTab = 'budget' | 'expenses' | 'vendors' | 'gifts' | 'tasks' | 'timeline';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// CSV Export utilities
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AdminPage() {
  // Initialize tabs from URL params, fallback to localStorage
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Check URL params first
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab && ['overview', 'rsvps', 'addresses', 'seating', 'guestbook', 'photos', 'emails', 'planning'].includes(urlTab)) {
        return urlTab as Tab;
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('admin_active_tab');
      if (saved && ['overview', 'rsvps', 'addresses', 'seating', 'guestbook', 'photos', 'emails', 'planning'].includes(saved)) {
        return saved as Tab;
      }
    }
    return 'overview';
  });

  const [stats, setStats] = useState<Stats | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [addresses, setAddresses] = useState<GuestAddress[]>([]);
  const [seatingTables, setSeatingTables] = useState<SeatingTable[]>([]);
  const [seatingAssignments, setSeatingAssignments] = useState<SeatingAssignment[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<UnassignedGuest[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(8);
  const [openAssignDropdown, setOpenAssignDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk email state
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtmlContent, setEmailHtmlContent] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearEditor, setClearEditor] = useState(false);
  const [textToInsert, setTextToInsert] = useState<string | null>(null);

  // Couple Dashboard / Planning state (with URL and localStorage persistence)
  const [planningSubTab, setPlanningSubTab] = useState<PlanningSubTab>(() => {
    if (typeof window !== 'undefined') {
      // Check URL params first
      const urlSubtab = new URLSearchParams(window.location.search).get('subtab');
      if (urlSubtab && ['budget', 'expenses', 'vendors', 'gifts', 'tasks', 'timeline'].includes(urlSubtab)) {
        return urlSubtab as PlanningSubTab;
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('admin_planning_subtab');
      if (saved && ['budget', 'expenses', 'vendors', 'gifts', 'tasks', 'timeline'].includes(saved)) {
        return saved as PlanningSubTab;
      }
    }
    return 'budget';
  });
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({ total_budget: 0, currency: 'USD' });
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotals>({ budget: 0, estimated: 0, spent: 0, paid: 0, remaining: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftTotals, setGiftTotals] = useState<GiftTotals>({ totalCash: 0, totalGifts: 0, thankYouPending: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, completed: 0, pending: 0, overdue: 0, upcoming: 0 });
  const [expenseTotals, setExpenseTotals] = useState<ExpenseTotals>({ totalAmount: 0, totalPaid: 0, totalBalance: 0, countPending: 0, countPartial: 0, countPaid: 0 });
  const [vendorTotals, setVendorTotals] = useState<VendorTotals>({ totalContracted: 0, totalPaid: 0, totalBalance: 0, countBooked: 0, countPaid: 0, countResearching: 0 });
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  // Form states for adding items
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddGift, setShowAddGift] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Edit states
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Persist tab state to localStorage and URL
  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
    // Update URL without navigation
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (activeTab !== 'planning') {
      params.delete('subtab');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('admin_planning_subtab', planningSubTab);
    // Update URL without navigation
    if (activeTab === 'planning') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', 'planning');
      params.set('subtab', planningSubTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [planningSubTab, activeTab]);

  // Refetch helper functions for real-time updates
  const refetchBudget = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/budget');
      const data = await response.json();
      if (!data.error) {
        setBudgetSettings(data.settings);
        setBudgetCategories(data.categories || []);
        setBudgetTotals(data.totals);
      }
    } catch (err) {
      console.error('Failed to refetch budget:', err);
    }
  }, []);

  const refetchExpenses = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/expenses');
      const data = await response.json();
      if (!data.error) {
        setExpenses(data.expenses || []);
        setExpenseTotals(data.totals || { totalAmount: 0, totalPaid: 0, totalBalance: 0, countPending: 0, countPartial: 0, countPaid: 0 });
      }
    } catch (err) {
      console.error('Failed to refetch expenses:', err);
    }
  }, []);

  const refetchVendors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/vendors');
      const data = await response.json();
      if (!data.error) {
        setVendors(data.vendors || []);
        setVendorTotals(data.totals || { totalContracted: 0, totalPaid: 0, totalBalance: 0, countBooked: 0, countPaid: 0, countResearching: 0 });
      }
    } catch (err) {
      console.error('Failed to refetch vendors:', err);
    }
  }, []);

  const refetchGifts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/gifts');
      const data = await response.json();
      if (!data.error) {
        setGifts(data.gifts || []);
        setGiftTotals(data.totals || { totalCash: 0, totalGifts: 0, thankYouPending: 0 });
      }
    } catch (err) {
      console.error('Failed to refetch gifts:', err);
    }
  }, []);

  const refetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tasks');
      const data = await response.json();
      if (!data.error) {
        setTasks(data.tasks || []);
        setTaskStats(data.stats || { total: 0, completed: 0, pending: 0, overdue: 0, upcoming: 0 });
      }
    } catch (err) {
      console.error('Failed to refetch tasks:', err);
    }
  }, []);

  const refetchTimeline = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/timeline');
      const data = await response.json();
      if (!data.error) {
        setTimelineEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to refetch timeline:', err);
    }
  }, []);

  const refetchRsvps = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/rsvps');
      const data = await response.json();
      if (!data.error) {
        setRsvps(data.rsvps || []);
      }
    } catch (err) {
      console.error('Failed to refetch rsvps:', err);
    }
  }, []);

  const refetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (!data.error) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to refetch stats:', err);
    }
  }, []);

  // Real-time subscriptions for planning tables
  useEffect(() => {
    if (!supabase) return;

    // Subscribe to all planning-related tables
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        refetchExpenses();
        refetchBudget(); // Budget totals depend on expenses
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        refetchVendors();
        refetchBudget(); // Budget totals depend on vendors
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_settings' }, () => {
        refetchBudget();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_categories' }, () => {
        refetchBudget();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gifts' }, () => {
        refetchGifts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        refetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_events' }, () => {
        refetchTimeline();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => {
        refetchRsvps();
        refetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guestbook' }, async () => {
        try {
          const response = await fetch('/api/admin/guestbook');
          const data = await response.json();
          if (!data.error) setGuestbook(data.entries || []);
        } catch (err) {
          console.error('Failed to refetch guestbook:', err);
        }
        refetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, async () => {
        try {
          const response = await fetch('/api/admin/photos');
          const data = await response.json();
          if (!data.error) setPhotos(data.photos || []);
        } catch (err) {
          console.error('Failed to refetch photos:', err);
        }
        refetchStats();
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [refetchBudget, refetchExpenses, refetchVendors, refetchGifts, refetchTasks, refetchTimeline, refetchRsvps, refetchStats]);

  // Get all unique email recipients from addresses and RSVPs with full data
  const availableRecipients = useMemo(() => {
    interface RecipientData {
      email: string;
      name: string;
      source: string;
      address?: {
        street: string;
        street2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      rsvpStatus?: 'attending' | 'not_attending' | null;
    }

    const recipientMap = new Map<string, RecipientData>();

    // Add addresses
    addresses.forEach(addr => {
      if (addr.email && !recipientMap.has(addr.email.toLowerCase())) {
        recipientMap.set(addr.email.toLowerCase(), {
          email: addr.email,
          name: addr.name,
          source: 'address',
          address: {
            street: addr.street_address,
            street2: addr.street_address_2 || undefined,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postal_code,
            country: addr.country,
          },
          rsvpStatus: addr.rsvps ? (addr.rsvps.attending ? 'attending' : 'not_attending') : null,
        });
      }
    });

    // Add RSVPs (may update existing entries with RSVP source)
    rsvps.forEach(rsvp => {
      if (rsvp.email) {
        const existing = recipientMap.get(rsvp.email.toLowerCase());
        if (existing) {
          existing.source = 'both';
          existing.rsvpStatus = rsvp.attending ? 'attending' : 'not_attending';
        } else {
          recipientMap.set(rsvp.email.toLowerCase(), {
            email: rsvp.email,
            name: rsvp.name,
            source: 'rsvp',
            rsvpStatus: rsvp.attending ? 'attending' : 'not_attending',
          });
        }
      }
    });

    return Array.from(recipientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [addresses, rsvps]);

  // Template variables available for insertion
  const templateVariables = [
    { key: '{{name}}', label: 'Full Name', description: 'Guest full name' },
    { key: '{{first_name}}', label: 'First Name', description: 'Guest first name' },
    { key: '{{email}}', label: 'Email', description: 'Guest email address' },
    { key: '{{full_address}}', label: 'Full Address', description: 'Complete mailing address' },
    { key: '{{city}}', label: 'City', description: 'City name' },
    { key: '{{state}}', label: 'State', description: 'State/Province' },
    { key: '{{rsvp_status}}', label: 'RSVP Status', description: 'Attending/Not Attending/No RSVP' },
  ];

  // Toggle recipient selection
  const toggleRecipient = (email: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedRecipients(newSelected);
  };

  // Select/deselect all recipients
  const toggleAllRecipients = () => {
    if (selectedRecipients.size === availableRecipients.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(availableRecipients.map(r => r.email)));
    }
  };

  // Send bulk email
  const sendBulkEmail = async () => {
    if (selectedRecipients.size === 0) {
      setEmailSendResult({ success: false, message: 'Please select at least one recipient' });
      return;
    }
    if (!emailSubject.trim()) {
      setEmailSendResult({ success: false, message: 'Please enter a subject' });
      return;
    }
    if (!emailHtmlContent.trim() || emailHtmlContent === '<p><br></p>') {
      setEmailSendResult({ success: false, message: 'Please enter email content' });
      return;
    }

    const confirmSend = confirm(`Send email to ${selectedRecipients.size} recipient${selectedRecipients.size === 1 ? '' : 's'}?`);
    if (!confirmSend) return;

    setSendingEmail(true);
    setEmailSendResult(null);

    try {
      const recipients = availableRecipients
        .filter(r => selectedRecipients.has(r.email))
        .map(r => ({ email: r.email, name: r.name }));

      const response = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject: emailSubject,
          htmlContent: emailHtmlContent,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setEmailSendResult({ success: false, message: data.error });
      } else {
        setEmailSendResult({
          success: true,
          message: `Successfully sent ${data.successCount} email${data.successCount === 1 ? '' : 's'}${data.failCount > 0 ? `, ${data.failCount} failed` : ''}`,
        });
        // Reset form on success
        setEmailSubject('');
        setEmailHtmlContent('');
        setSelectedRecipients(new Set());
        setClearEditor(true);
        // Refresh emails list
        const emailsResponse = await fetch('/api/admin/emails');
        const emailsData = await emailsResponse.json();
        if (!emailsData.error) {
          setEmails(emailsData.emails);
        }
      }
    } catch (err) {
      setEmailSendResult({ success: false, message: 'Failed to send emails' });
    } finally {
      setSendingEmail(false);
    }
  };

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
          // Fetch emails, addresses, and RSVPs for compose feature
          const [emailsRes, addressesRes, rsvpsRes] = await Promise.all([
            fetch('/api/admin/emails'),
            fetch('/api/admin/addresses'),
            fetch('/api/admin/rsvps'),
          ]);
          const [emailsData, addressesData, rsvpsData] = await Promise.all([
            emailsRes.json(),
            addressesRes.json(),
            rsvpsRes.json(),
          ]);
          if (emailsData.error) throw new Error(emailsData.error);
          setEmails(emailsData.emails);
          if (!addressesData.error) setAddresses(addressesData.addresses || []);
          if (!rsvpsData.error) setRsvps(rsvpsData.rsvps || []);
        } else if (activeTab === 'addresses') {
          const response = await fetch('/api/admin/addresses');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setAddresses(data.addresses);
        } else if (activeTab === 'seating') {
          const response = await fetch('/api/admin/seating');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setSeatingTables(data.tables);
          setSeatingAssignments(data.assignments);
          setUnassignedGuests(data.unassignedGuests);
        } else if (activeTab === 'planning') {
          // Fetch all planning data in parallel
          const [budgetRes, expensesRes, vendorsRes, giftsRes, tasksRes, timelineRes] = await Promise.all([
            fetch('/api/admin/budget'),
            fetch('/api/admin/expenses'),
            fetch('/api/admin/vendors'),
            fetch('/api/admin/gifts'),
            fetch('/api/admin/tasks'),
            fetch('/api/admin/timeline'),
          ]);
          const [budgetData, expensesData, vendorsData, giftsData, tasksData, timelineData] = await Promise.all([
            budgetRes.json(),
            expensesRes.json(),
            vendorsRes.json(),
            giftsRes.json(),
            tasksRes.json(),
            timelineRes.json(),
          ]);
          if (!budgetData.error) {
            setBudgetSettings(budgetData.settings);
            setBudgetCategories(budgetData.categories || []);
            setBudgetTotals(budgetData.totals);
          }
          if (!expensesData.error) {
            setExpenses(expensesData.expenses || []);
            setExpenseTotals(expensesData.totals || { totalAmount: 0, totalPaid: 0, totalBalance: 0, countPending: 0, countPartial: 0, countPaid: 0 });
          }
          if (!vendorsData.error) {
            setVendors(vendorsData.vendors || []);
            setVendorTotals(vendorsData.totals || { totalContracted: 0, totalPaid: 0, totalBalance: 0, countBooked: 0, countPaid: 0, countResearching: 0 });
          }
          if (!giftsData.error) {
            setGifts(giftsData.gifts || []);
            setGiftTotals(giftsData.totals || { totalCash: 0, totalGifts: 0, thankYouPending: 0 });
          }
          if (!tasksData.error) {
            setTasks(tasksData.tasks || []);
            setTaskStats(tasksData.stats || { total: 0, completed: 0, pending: 0, overdue: 0, upcoming: 0 });
          }
          if (!timelineData.error) {
            setTimelineEvents(timelineData.events || []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (activeTab === 'overview') {
      // Fetch planning data for dashboard summaries
      async function fetchPlanningForDashboard() {
        try {
          const [expensesRes, vendorsRes, giftsRes, tasksRes, timelineRes] = await Promise.all([
            fetch('/api/admin/expenses'),
            fetch('/api/admin/vendors'),
            fetch('/api/admin/gifts'),
            fetch('/api/admin/tasks'),
            fetch('/api/admin/timeline'),
          ]);
          const [expensesData, vendorsData, giftsData, tasksData, timelineData] = await Promise.all([
            expensesRes.json(),
            vendorsRes.json(),
            giftsRes.json(),
            tasksRes.json(),
            timelineRes.json(),
          ]);
          if (!expensesData.error) {
            setExpenses(expensesData.expenses || []);
            setExpenseTotals(expensesData.totals || { totalAmount: 0, totalPaid: 0, totalBalance: 0, countPending: 0, countPartial: 0, countPaid: 0 });
          }
          if (!vendorsData.error) {
            setVendors(vendorsData.vendors || []);
            setVendorTotals(vendorsData.totals || { totalContracted: 0, totalPaid: 0, totalBalance: 0, countBooked: 0, countPaid: 0, countResearching: 0 });
          }
          if (!giftsData.error) {
            setGifts(giftsData.gifts || []);
            setGiftTotals(giftsData.totals || { totalCash: 0, totalGifts: 0, thankYouPending: 0 });
          }
          if (!tasksData.error) {
            setTasks(tasksData.tasks || []);
          }
          if (!timelineData.error) {
            setTimelineEvents(timelineData.events || []);
          }
        } catch (err) {
          console.error('Failed to fetch planning data for dashboard:', err);
        }
        setLoading(false);
      }
      fetchPlanningForDashboard();
    } else {
      fetchData();
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

  const deleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const response = await fetch('/api/admin/addresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete address:', err);
      alert('Failed to delete address. Please try again.');
    }
  };

  // Export RSVPs with meal choices (for caterer)
  const exportMealChoices = () => {
    const attendingRsvps = rsvps.filter(r => r.attending);
    const rows: string[][] = [
      ['Name', 'Email', 'Meal Choice', 'Dietary Restrictions', 'Is Child', 'Party Size']
    ];

    attendingRsvps.forEach(rsvp => {
      // Primary guest
      rows.push([
        escapeCSV(rsvp.name),
        escapeCSV(rsvp.email),
        escapeCSV(rsvp.meal_choice),
        escapeCSV(rsvp.dietary_restrictions),
        'No',
        String(1 + (rsvp.additional_guests?.length || 0))
      ]);

      // Additional guests
      rsvp.additional_guests?.forEach(guest => {
        rows.push([
          escapeCSV(guest.name),
          '',
          escapeCSV(guest.mealChoice),
          '',
          guest.isChild ? 'Yes' : 'No',
          ''
        ]);
      });
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `meal-choices-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export full RSVP data
  const exportAllRsvps = () => {
    const rows: string[][] = [
      ['Name', 'Email', 'Attending', 'Meal Choice', 'Dietary Restrictions', 'Additional Guests', 'Song Request', 'Message', 'Date']
    ];

    rsvps.forEach(rsvp => {
      const guestNames = rsvp.additional_guests?.map(g => g.name).join('; ') || '';
      rows.push([
        escapeCSV(rsvp.name),
        escapeCSV(rsvp.email),
        rsvp.attending ? 'Yes' : 'No',
        escapeCSV(rsvp.meal_choice),
        escapeCSV(rsvp.dietary_restrictions),
        escapeCSV(guestNames),
        escapeCSV(rsvp.song_request),
        escapeCSV(rsvp.message),
        new Date(rsvp.created_at).toLocaleDateString()
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `all-rsvps-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export addresses for mailing labels
  const exportAddresses = () => {
    const rows: string[][] = [
      ['Name', 'Street Address', 'Address Line 2', 'City', 'State', 'ZIP', 'Country', 'Email', 'Phone', 'RSVP Status']
    ];

    addresses.forEach(addr => {
      rows.push([
        escapeCSV(addr.name),
        escapeCSV(addr.street_address),
        escapeCSV(addr.street_address_2),
        escapeCSV(addr.city),
        escapeCSV(addr.state),
        escapeCSV(addr.postal_code),
        escapeCSV(addr.country),
        escapeCSV(addr.email),
        escapeCSV(addr.phone),
        addr.rsvps ? (addr.rsvps.attending ? 'Attending' : 'Not Attending') : 'No RSVP'
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `mailing-addresses-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Seating chart functions
  const createTable = async () => {
    if (!newTableName.trim()) return;
    try {
      const response = await fetch('/api/admin/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTableName, capacity: newTableCapacity }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSeatingTables([...seatingTables, data.table]);
      setNewTableName('');
      setNewTableCapacity(8);
    } catch (err) {
      console.error('Failed to create table:', err);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm('Delete this table? All guest assignments will be removed.')) return;
    try {
      await fetch('/api/admin/seating', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId }),
      });
      setSeatingTables(seatingTables.filter(t => t.id !== tableId));
      // Move assignments back to unassigned
      const removedAssignments = seatingAssignments.filter(a => a.table_id === tableId);
      setSeatingAssignments(seatingAssignments.filter(a => a.table_id !== tableId));
      setUnassignedGuests([
        ...unassignedGuests,
        ...removedAssignments.map(a => ({
          name: a.guest_name,
          rsvpId: a.rsvp_id || '',
          email: '',
          isAdditionalGuest: a.is_additional_guest,
        })),
      ]);
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  };

  const assignGuest = async (tableId: string, guest: UnassignedGuest) => {
    try {
      const response = await fetch('/api/admin/seating/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          guestName: guest.name,
          rsvpId: guest.rsvpId,
          isAdditionalGuest: guest.isAdditionalGuest,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setSeatingAssignments([...seatingAssignments.filter(a => a.guest_name.toLowerCase() !== guest.name.toLowerCase()), data.assignment]);
      setUnassignedGuests(unassignedGuests.filter(g => g.name.toLowerCase() !== guest.name.toLowerCase()));
    } catch (err) {
      console.error('Failed to assign guest:', err);
    }
  };

  const unassignGuest = async (assignment: SeatingAssignment) => {
    try {
      await fetch('/api/admin/seating/assign', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignment.id }),
      });
      setSeatingAssignments(seatingAssignments.filter(a => a.id !== assignment.id));
      setUnassignedGuests([
        ...unassignedGuests,
        {
          name: assignment.guest_name,
          rsvpId: assignment.rsvp_id || '',
          email: '',
          isAdditionalGuest: assignment.is_additional_guest,
        },
      ]);
    } catch (err) {
      console.error('Failed to unassign guest:', err);
    }
  };

  const getTableAssignments = (tableId: string) =>
    seatingAssignments.filter(a => a.table_id === tableId);

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
      id: 'addresses',
      label: 'Addresses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'seating',
      label: 'Seating',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
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
    {
      id: 'planning',
      label: 'Planning',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  // Planning sub-tabs
  const planningSubTabs: { id: PlanningSubTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'budget',
      label: 'Budget',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'gifts',
      label: 'Gifts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Helper functions for planning
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: budgetSettings.currency || 'USD' }).format(amount);
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const updateBudget = async () => {
    try {
      const response = await fetch('/api/admin/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_budget: parseFloat(newBudgetAmount) || 0 }),
      });
      const data = await response.json();
      if (!data.error) {
        setBudgetSettings(data.settings);
        setBudgetTotals(prev => ({ ...prev, budget: data.settings.total_budget, remaining: data.settings.total_budget - prev.spent }));
        setEditingBudget(false);
      }
    } catch (err) {
      console.error('Failed to update budget:', err);
    }
  };

  const updateCategoryBudget = async (categoryId: string, amount: number) => {
    try {
      const response = await fetch('/api/admin/budget/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId, estimated_amount: amount }),
      });
      const data = await response.json();
      if (!data.error) {
        setBudgetCategories(prev => prev.map(c => c.id === categoryId ? { ...c, estimated_amount: amount } : c));
      }
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      });
      const data = await response.json();
      if (!data.error) {
        setTasks(prev => prev.map(t => t.id === task.id ? data.task : t));
        setTaskStats(prev => ({
          ...prev,
          completed: task.completed ? prev.completed - 1 : prev.completed + 1,
          pending: task.completed ? prev.pending + 1 : prev.pending - 1,
        }));
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Update task (full edit)
  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!data.error && data.task) {
        setTasks(prev => prev.map(t => t.id === id ? data.task : t));
        setEditingTaskId(null);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const toggleThankYou = async (gift: Gift) => {
    try {
      const response = await fetch('/api/admin/gifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gift.id, thank_you_sent: !gift.thank_you_sent }),
      });
      const data = await response.json();
      if (!data.error) {
        setGifts(prev => prev.map(g => g.id === gift.id ? data.gift : g));
        setGiftTotals(prev => ({
          ...prev,
          thankYouPending: gift.thank_you_sent ? prev.thankYouPending + 1 : prev.thankYouPending - 1,
        }));
      }
    } catch (err) {
      console.error('Failed to toggle thank you:', err);
    }
  };

  // Update gift (full edit)
  const updateGift = async (id: string, updates: Partial<Gift>) => {
    try {
      const response = await fetch('/api/admin/gifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!data.error && data.gift) {
        const oldGift = gifts.find(g => g.id === id);
        setGifts(prev => prev.map(g => g.id === id ? data.gift : g));
        // Recalculate gift totals
        if (oldGift) {
          const oldAmount = (oldGift.gift_type === 'cash' || oldGift.gift_type === 'check') ? (oldGift.amount || 0) : 0;
          const newAmount = (data.gift.gift_type === 'cash' || data.gift.gift_type === 'check') ? (data.gift.amount || 0) : 0;
          setGiftTotals(prev => ({
            ...prev,
            totalCash: prev.totalCash - oldAmount + newAmount,
          }));
        }
        setEditingGiftId(null);
      }
    } catch (err) {
      console.error('Failed to update gift:', err);
    }
  };

  // Helper to recalculate expense totals from current expenses list
  const recalculateExpenseTotals = (expensesList: Expense[]) => {
    const totals = {
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
      countPending: 0,
      countPartial: 0,
      countPaid: 0,
    };
    expensesList.forEach(expense => {
      const amount = Number(expense.amount) || 0;
      const paid = Number(expense.amount_paid) || 0;
      totals.totalAmount += amount;
      totals.totalPaid += paid;
      totals.totalBalance += (amount - paid);
      if (expense.payment_status === 'pending') totals.countPending++;
      else if (expense.payment_status === 'partial') totals.countPartial++;
      else if (expense.payment_status === 'paid') totals.countPaid++;
    });
    setExpenseTotals(totals);
  };

  // Helper to recalculate vendor totals
  const recalculateVendorTotals = (vendorsList: Vendor[]) => {
    const totals = {
      totalContracted: 0,
      totalPaid: 0,
      totalBalance: 0,
      countBooked: 0,
      countPaid: 0,
      countResearching: 0,
    };
    vendorsList.forEach(vendor => {
      const contracted = Number(vendor.contract_amount) || 0;
      const paid = Number(vendor.amount_paid) || 0;
      totals.totalContracted += contracted;
      totals.totalPaid += paid;
      totals.totalBalance += (contracted - paid);
      if (vendor.status === 'booked') totals.countBooked++;
      else if (vendor.status === 'paid') totals.countPaid++;
      else if (vendor.status === 'researching') totals.countResearching++;
    });
    setVendorTotals(totals);
  };

  // Update expense (e.g., mark as paid)
  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!data.error && data.expense) {
        const newExpenses = expenses.map(e => e.id === id ? data.expense : e);
        setExpenses(newExpenses);
        recalculateExpenseTotals(newExpenses);
      }
    } catch (err) {
      console.error('Failed to update expense:', err);
    }
  };

  // Mark expense as fully paid
  const markExpensePaid = async (expense: Expense) => {
    await updateExpense(expense.id, {
      amount_paid: expense.amount,
      payment_status: 'paid'
    });
  };

  // Update vendor payment
  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!data.error && data.vendor) {
        const newVendors = vendors.map(v => v.id === id ? data.vendor : v);
        setVendors(newVendors);
        recalculateVendorTotals(newVendors);
      }
    } catch (err) {
      console.error('Failed to update vendor:', err);
    }
  };

  // Mark vendor as fully paid
  const markVendorPaid = async (vendor: Vendor) => {
    await updateVendor(vendor.id, {
      amount_paid: vendor.contract_amount,
      status: 'paid'
    });
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch('/api/admin/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const newExpenses = expenses.filter(e => e.id !== id);
      setExpenses(newExpenses);
      recalculateExpenseTotals(newExpenses);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      await fetch('/api/admin/vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const newVendors = vendors.filter(v => v.id !== id);
      setVendors(newVendors);
      recalculateVendorTotals(newVendors);
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    }
  };

  const deleteGift = async (id: string) => {
    if (!confirm('Delete this gift record?')) return;
    try {
      await fetch('/api/admin/gifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setGifts(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Failed to delete gift:', err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch('/api/admin/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Update timeline event
  const updateTimelineEvent = async (id: string, updates: Partial<TimelineEvent>) => {
    try {
      const response = await fetch('/api/admin/timeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (!data.error && data.event) {
        setTimelineEvents(prev => prev.map(e => e.id === id ? data.event : e));
        setEditingTimelineId(null);
      }
    } catch (err) {
      console.error('Failed to update timeline event:', err);
    }
  };

  const deleteTimelineEvent = async (id: string) => {
    if (!confirm('Delete this timeline event?')) return;
    try {
      await fetch('/api/admin/timeline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setTimelineEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete timeline event:', err);
    }
  };

  const toggleMilestone = async (event: TimelineEvent) => {
    try {
      const response = await fetch('/api/admin/timeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, is_milestone: !event.is_milestone }),
      });
      const data = await response.json();
      if (!data.error) {
        setTimelineEvents(prev => prev.map(e => e.id === event.id ? data.event : e));
      }
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      preparation: 'Preparation',
      ceremony: 'Ceremony',
      cocktail_hour: 'Cocktail Hour',
      reception: 'Reception',
      photos: 'Photos',
      transportation: 'Transportation',
      vendor_arrival: 'Vendor Arrival',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      preparation: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      ceremony: 'bg-gold-500/20 text-gold-400 border-gold-500/50',
      cocktail_hour: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      reception: 'bg-green-500/20 text-green-400 border-green-500/50',
      photos: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
      transportation: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      vendor_arrival: 'bg-teal-500/20 text-teal-400 border-teal-500/50',
      other: 'bg-olive-500/20 text-olive-400 border-olive-500/50',
    };
    return colors[category] || colors.other;
  };

  // PDF Export for Timeline
  const exportTimelinePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    // Group events by date
    const eventsByDate = timelineEvents.reduce((acc, event) => {
      const date = event.event_date || '2027-10-31';
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const getDateLabel = (date: string) => {
      if (date === '2027-10-30') return 'Friday, October 30 — Rehearsal';
      if (date === '2027-10-31') return 'Saturday, October 31 — Wedding Day';
      if (date === '2027-11-01') return 'Sunday, November 1 — After Midnight';
      return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wedding Timeline - Nate & Blake</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; font-size: 28px; margin-bottom: 5px; color: #536537; }
          h2 { text-align: center; font-size: 18px; color: #666; font-weight: normal; margin-bottom: 30px; }
          .date-section { margin-bottom: 30px; }
          .date-header { background: #536537; color: white; padding: 10px 15px; font-size: 16px; font-weight: bold; margin-bottom: 15px; }
          .event { display: flex; margin-bottom: 12px; page-break-inside: avoid; }
          .time { width: 100px; font-weight: bold; color: #d4af37; flex-shrink: 0; }
          .details { flex: 1; border-left: 2px solid #d4af37; padding-left: 15px; }
          .title { font-weight: bold; font-size: 14px; }
          .milestone { background: #d4af37; color: white; padding: 2px 8px; font-size: 11px; border-radius: 3px; margin-left: 8px; }
          .meta { font-size: 12px; color: #666; margin-top: 3px; }
          .location { color: #536537; }
          .category { display: inline-block; padding: 2px 8px; font-size: 10px; border-radius: 3px; background: #f0f0f0; margin-top: 5px; }
          .notes { font-style: italic; font-size: 12px; color: #888; margin-top: 5px; }
          .staff-notes { background: #fff3cd; padding: 8px; font-size: 11px; margin-top: 5px; border-radius: 3px; }
          .staff-notes strong { color: #856404; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { body { padding: 20px; } .date-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Wedding Timeline</h1>
        <h2>Nate & Blake | October 30-31, 2027</h2>
        ${Object.entries(eventsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, events]) => `
          <div class="date-section">
            <div class="date-header">${getDateLabel(date)}</div>
            ${events.map(event => `
              <div class="event">
                <div class="time">${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</div>
                <div class="details">
                  <div class="title">
                    ${event.title}
                    ${event.is_milestone ? '<span class="milestone">KEY MOMENT</span>' : ''}
                  </div>
                  ${event.location ? `<div class="meta location">📍 ${event.location}${event.location_notes ? ` (${event.location_notes})` : ''}</div>` : ''}
                  ${event.responsible_person ? `<div class="meta">👤 ${event.responsible_person}</div>` : ''}
                  ${event.participants ? `<div class="meta">👥 ${event.participants}</div>` : ''}
                  ${event.vendor ? `<div class="meta">🏢 ${event.vendor.name}${event.vendor.phone ? ` | ${event.vendor.phone}` : ''}</div>` : ''}
                  <div class="category">${getCategoryLabel(event.category)}</div>
                  ${event.notes ? `<div class="notes">${event.notes}</div>` : ''}
                  ${event.staff_notes ? `<div class="staff-notes"><strong>Staff Notes:</strong> ${event.staff_notes}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} | Wedding Planning Dashboard
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

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
                <div className="text-olive-400 text-sm mt-1">
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

              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-teal-400 mb-2">
                  {stats?.addresses?.total || 0}
                </div>
                <div className="text-olive-300">Addresses Collected</div>
                <div className="text-olive-400 text-sm mt-1">
                  {stats?.addresses?.linked || 0} linked to RSVPs
                </div>
              </div>

              {/* Budget Summary - Combined Expenses + Vendors */}
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-gold-500 mb-2">
                  {formatCurrency(expenseTotals.totalAmount + vendorTotals.totalContracted)}
                </div>
                <div className="text-olive-300">Total Committed</div>
                <div className="text-olive-400 text-sm mt-1">
                  <span className="text-green-400">{formatCurrency(expenseTotals.totalPaid + vendorTotals.totalPaid)} paid</span>
                  {(expenseTotals.totalBalance + vendorTotals.totalBalance) > 0 && (
                    <span className="text-yellow-400"> · {formatCurrency(expenseTotals.totalBalance + vendorTotals.totalBalance)} due</span>
                  )}
                </div>
              </div>

              {/* Vendors Summary */}
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-orange-400 mb-2">
                  {vendors.length}
                </div>
                <div className="text-olive-300">Vendors</div>
                <div className="text-olive-400 text-sm mt-1">
                  <span className="text-green-400">{vendorTotals.countPaid + vendorTotals.countBooked} booked</span>
                  {vendorTotals.totalBalance > 0 && (
                    <span className="text-yellow-400"> · {formatCurrency(vendorTotals.totalBalance)} due</span>
                  )}
                </div>
              </div>

              {/* Timeline Summary */}
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-indigo-400 mb-2">
                  {timelineEvents.length}
                </div>
                <div className="text-olive-300">Timeline Events</div>
                <div className="text-olive-400 text-sm mt-1">
                  {timelineEvents.filter(e => e.is_milestone).length} key moments
                </div>
              </div>

              {/* Tasks Summary */}
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-cyan-400 mb-2">
                  {tasks.filter(t => t.completed).length}/{tasks.length}
                </div>
                <div className="text-olive-300">Tasks Complete</div>
                <div className="text-olive-400 text-sm mt-1">
                  {tasks.filter(t => !t.completed).length} pending
                </div>
              </div>

              {/* Gifts Summary */}
              <div className="bg-black/50 border border-olive-700 rounded-lg p-6 text-center">
                <div className="text-4xl font-heading text-pink-400 mb-2">
                  {formatCurrency(giftTotals.totalCash)}
                </div>
                <div className="text-olive-300">Gifts Received</div>
                <div className="text-olive-400 text-sm mt-1">
                  {giftTotals.totalGifts} gifts · {giftTotals.thankYouPending} thank yous pending
                </div>
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
                <>
                  {/* Export Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={exportMealChoices}
                      className="flex items-center gap-2 px-3 py-2 bg-olive-800/50 text-olive-300 rounded-lg hover:bg-olive-700/50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Meal Choices (Caterer)
                    </button>
                    <button
                      onClick={exportAllRsvps}
                      className="flex items-center gap-2 px-3 py-2 bg-olive-800/50 text-olive-300 rounded-lg hover:bg-olive-700/50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export All RSVPs
                    </button>
                  </div>
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
                                <div className="text-xs text-olive-400 mt-1">
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
                            <td className="p-3 text-olive-400 text-sm">{formatDate(rsvp.created_at)}</td>
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
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'addresses' && (
            <motion.div
              key="addresses"
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
              ) : addresses.length === 0 ? (
                <div className="text-center py-12 text-olive-400">No addresses collected yet</div>
              ) : (
                <>
                  {/* Export Button */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={exportAddresses}
                      className="flex items-center gap-2 px-3 py-2 bg-olive-800/50 text-olive-300 rounded-lg hover:bg-olive-700/50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Mailing Labels (CSV)
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-olive-700">
                        <th className="p-3 text-olive-300 font-medium">Name</th>
                        <th className="p-3 text-olive-300 font-medium">Email</th>
                        <th className="p-3 text-olive-300 font-medium">Address</th>
                        <th className="p-3 text-olive-300 font-medium">RSVP Status</th>
                        <th className="p-3 text-olive-300 font-medium">Date</th>
                        <th className="p-3 text-olive-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addresses.map((addr) => (
                        <tr key={addr.id} className="border-b border-olive-800 hover:bg-olive-900/30">
                          <td className="p-3 text-cream">
                            {addr.name}
                            {addr.phone && (
                              <div className="text-xs text-olive-400 mt-1">{addr.phone}</div>
                            )}
                          </td>
                          <td className="p-3 text-olive-400">{addr.email}</td>
                          <td className="p-3 text-olive-300 text-sm">
                            <div>{addr.street_address}</div>
                            {addr.street_address_2 && <div>{addr.street_address_2}</div>}
                            <div>{addr.city}, {addr.state} {addr.postal_code}</div>
                            {addr.country !== 'United States' && <div>{addr.country}</div>}
                          </td>
                          <td className="p-3">
                            {addr.rsvps ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                addr.rsvps.attending ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {addr.rsvps.attending ? 'Attending' : 'Not Attending'}
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-olive-500/20 text-olive-400">
                                No RSVP
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-olive-400 text-sm">{formatDate(addr.created_at)}</td>
                          <td className="p-3">
                            <button
                              onClick={() => deleteAddress(addr.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Delete Address"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'seating' && (
            <motion.div
              key="seating"
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
              ) : (
                <div className="space-y-6">
                  {/* Create Table Form */}
                  <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gold-400 mb-3">Add New Table</h3>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm text-olive-300 mb-1">Table Name</label>
                        <input
                          type="text"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="e.g., Table 1, Head Table"
                          className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream focus:border-gold-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-sm text-olive-300 mb-1">Capacity</label>
                        <input
                          type="number"
                          value={newTableCapacity}
                          onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                          min={1}
                          max={20}
                          className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream focus:border-gold-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={createTable}
                        className="px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors font-medium"
                      >
                        Add Table
                      </button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Unassigned Guests */}
                    <div className="lg:col-span-1">
                      <div className="bg-black/50 border border-olive-700 rounded-lg p-4 sticky top-4">
                        <h3 className="text-lg font-medium text-gold-400 mb-3">
                          Unassigned Guests ({unassignedGuests.length})
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {unassignedGuests.length === 0 ? (
                            <p className="text-olive-400 text-sm">All guests assigned!</p>
                          ) : (
                            unassignedGuests.map((guest, idx) => {
                              const dropdownId = `${guest.name}-${idx}`;
                              const isOpen = openAssignDropdown === dropdownId;
                              return (
                                <div
                                  key={dropdownId}
                                  className="flex items-center justify-between p-2 bg-olive-900/30 rounded border border-olive-700"
                                >
                                  <span className="text-cream text-sm">
                                    {guest.name}
                                    {guest.isAdditionalGuest && (
                                      <span className="text-olive-400 text-xs ml-1">(+1)</span>
                                    )}
                                  </span>
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenAssignDropdown(isOpen ? null : dropdownId)}
                                      className="text-gold-400 hover:text-gold-300 text-xs px-2 py-1 bg-olive-800 rounded"
                                    >
                                      Assign ▾
                                    </button>
                                    {isOpen && (
                                      <>
                                        {/* Backdrop to close dropdown */}
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setOpenAssignDropdown(null)}
                                        />
                                        {/* Dropdown menu */}
                                        <div className="absolute right-0 bottom-full mb-1 bg-charcoal border border-olive-600 rounded-lg shadow-lg z-50 min-w-[150px] max-h-[200px] overflow-y-auto">
                                          {seatingTables.length === 0 ? (
                                            <p className="px-3 py-2 text-olive-400 text-sm">No tables yet</p>
                                          ) : (
                                            seatingTables.map(table => (
                                              <button
                                                key={table.id}
                                                onClick={() => {
                                                  assignGuest(table.id, guest);
                                                  setOpenAssignDropdown(null);
                                                }}
                                                className="block w-full text-left px-3 py-2 text-sm text-olive-300 hover:bg-olive-800 hover:text-cream first:rounded-t-lg last:rounded-b-lg"
                                              >
                                                {table.name}
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tables Grid */}
                    <div className="lg:col-span-2">
                      {seatingTables.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">
                          No tables created yet. Add a table above to get started.
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {seatingTables.map(table => {
                            const assignments = getTableAssignments(table.id);
                            const isFull = assignments.length >= table.capacity;
                            return (
                              <div
                                key={table.id}
                                className={`bg-black/50 border rounded-lg p-4 ${
                                  isFull ? 'border-gold-500/50' : 'border-olive-700'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="text-cream font-medium">{table.name}</h4>
                                    <p className={`text-sm ${isFull ? 'text-gold-400' : 'text-olive-400'}`}>
                                      {assignments.length} / {table.capacity} seats
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => deleteTable(table.id)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Delete table"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {assignments.map(assignment => (
                                    <div
                                      key={assignment.id}
                                      className="flex items-center justify-between py-1 px-2 bg-olive-900/30 rounded text-sm"
                                    >
                                      <span className="text-olive-300">
                                        {assignment.guest_name}
                                        {assignment.is_additional_guest && (
                                          <span className="text-olive-400 text-xs ml-1">(+1)</span>
                                        )}
                                      </span>
                                      <button
                                        onClick={() => unassignGuest(assignment)}
                                        className="text-olive-400 hover:text-red-400"
                                        title="Remove from table"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                  {assignments.length === 0 && (
                                    <p className="text-olive-400 text-sm italic">No guests assigned</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
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
                        <p className="text-olive-400 text-sm mt-2">{formatDate(entry.created_at)}</p>
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
                        <p className="text-olive-400 text-xs">{formatDate(photo.created_at)}</p>
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
              {/* Compose Email Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowComposeEmail(!showComposeEmail)}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showComposeEmail ? 'Hide Compose' : 'Compose Email'}
                </button>
              </div>

              {/* Compose Email Section */}
              <AnimatePresence>
                {showComposeEmail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-8"
                  >
                    <div className="bg-black/50 border border-olive-700 rounded-lg p-6">
                      <h3 className="text-xl font-heading text-gold-400 mb-4">Send Bulk Email</h3>

                      {/* Result Message */}
                      {emailSendResult && (
                        <div className={`mb-4 p-3 rounded-lg ${
                          emailSendResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {emailSendResult.message}
                        </div>
                      )}

                      {/* Recipients */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-olive-300 font-medium">Recipients</label>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-olive-400">
                              {selectedRecipients.size} of {availableRecipients.length} selected
                            </span>
                            <button
                              type="button"
                              onClick={toggleAllRecipients}
                              className="text-sm text-gold-400 hover:text-gold-300"
                            >
                              {selectedRecipients.size === availableRecipients.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        </div>
                        <div className="bg-charcoal border border-olive-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                          {availableRecipients.length === 0 ? (
                            <p className="text-olive-400 text-sm">No recipients available. Add addresses or RSVPs first.</p>
                          ) : (
                            <div className="space-y-1">
                              {availableRecipients.map(recipient => (
                                <label
                                  key={recipient.email}
                                  className="flex items-center gap-3 p-2 hover:bg-olive-900/30 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedRecipients.has(recipient.email)}
                                    onChange={() => toggleRecipient(recipient.email)}
                                    className="w-4 h-4 rounded border-olive-600 text-gold-500 focus:ring-gold-500 bg-charcoal"
                                  />
                                  <span className="text-cream">{recipient.name}</span>
                                  <span className="text-olive-400 text-sm">{recipient.email}</span>
                                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                                    recipient.source === 'both' ? 'bg-purple-500/20 text-purple-400' :
                                    recipient.source === 'rsvp' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-olive-500/20 text-olive-400'
                                  }`}>
                                    {recipient.source === 'both' ? 'Address + RSVP' :
                                     recipient.source === 'rsvp' ? 'RSVP' : 'Address'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="mb-4">
                        <label className="block text-olive-300 font-medium mb-2">Subject</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Enter email subject..."
                          className="w-full px-4 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream focus:border-gold-500 focus:outline-none"
                        />
                      </div>

                      {/* Rich Text Editor */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-olive-300 font-medium">Message</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-olive-400">Insert:</span>
                            <div className="flex flex-wrap gap-1">
                              {templateVariables.map(v => (
                                <button
                                  key={v.key}
                                  type="button"
                                  onClick={() => setTextToInsert(v.key)}
                                  className="px-2 py-1 text-xs bg-olive-800 hover:bg-olive-700 text-gold-400 rounded transition-colors"
                                  title={v.description}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <RichTextEditor
                          onHtmlChange={setEmailHtmlContent}
                          placeholder="Write your message to guests..."
                          shouldClear={clearEditor}
                          onCleared={() => setClearEditor(false)}
                          textToInsert={textToInsert}
                          onInserted={() => setTextToInsert(null)}
                        />
                        <p className="text-olive-400 text-sm mt-2">
                          Your message will be wrapped in our branded email template. Use the insert buttons above to add personalized fields.
                        </p>
                      </div>

                      {/* Send Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={sendBulkEmail}
                          disabled={sendingEmail || selectedRecipients.size === 0}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                            sendingEmail || selectedRecipients.size === 0
                              ? 'bg-olive-700 text-olive-400 cursor-not-allowed'
                              : 'bg-gold-500 text-black hover:bg-gold-400'
                          }`}
                        >
                          {sendingEmail ? (
                            <>
                              <div className="w-4 h-4 border-2 border-olive-400 border-t-transparent rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Send to {selectedRecipients.size} Recipient{selectedRecipients.size === 1 ? '' : 's'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email History */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : (
                <>
                  <h3 className="text-lg font-heading text-olive-300 mb-4">Email History</h3>
                  {emails.length === 0 ? (
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
                              <td className="p-3 text-olive-400 text-sm">{formatDate(email.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'planning' && (
            <motion.div
              key="planning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Planning Sub-tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {planningSubTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPlanningSubTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
                      planningSubTab === tab.id
                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50'
                        : 'bg-olive-900/30 text-olive-400 border border-olive-700 hover:bg-olive-800/50'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-olive-500 border-t-gold-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-400">{error}</div>
              ) : (
                <>
                  {/* Budget Sub-tab */}
                  {planningSubTab === 'budget' && (
                    <div className="space-y-6">
                      {/* Budget Overview Cards */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <div className="text-olive-400 text-sm mb-1">Total Budget</div>
                          {editingBudget ? (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={newBudgetAmount}
                                onChange={(e) => setNewBudgetAmount(e.target.value)}
                                className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-lg"
                                placeholder="Enter budget"
                              />
                              <button onClick={updateBudget} className="px-2 py-1 bg-gold-500 text-black rounded text-sm">Save</button>
                              <button onClick={() => setEditingBudget(false)} className="px-2 py-1 bg-olive-700 text-cream rounded text-sm">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-2xl font-heading text-gold-500">{formatCurrency(budgetTotals.budget)}</div>
                              <button
                                onClick={() => { setNewBudgetAmount(String(budgetTotals.budget)); setEditingBudget(true); }}
                                className="text-olive-400 hover:text-gold-400"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <div className="text-olive-400 text-sm mb-1">Total Spent</div>
                          <div className="text-2xl font-heading text-cream">{formatCurrency(budgetTotals.spent)}</div>
                          <div className="text-sm text-olive-400">{budgetTotals.budget > 0 ? Math.round((budgetTotals.spent / budgetTotals.budget) * 100) : 0}% of budget</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <div className="text-olive-400 text-sm mb-1">Paid</div>
                          <div className="text-2xl font-heading text-green-400">{formatCurrency(budgetTotals.paid)}</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <div className="text-olive-400 text-sm mb-1">Remaining</div>
                          <div className={`text-2xl font-heading ${budgetTotals.remaining >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {formatCurrency(budgetTotals.remaining)}
                          </div>
                        </div>
                      </div>

                      {/* Budget by Category */}
                      <div className="bg-black/50 border border-olive-700 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-heading text-gold-400">Budget by Category</h3>
                          <button
                            onClick={() => setShowAddCategory(!showAddCategory)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Category
                          </button>
                        </div>

                        {/* Add Category Form */}
                        {showAddCategory && (
                          <div className="mb-4 p-4 bg-olive-900/30 border border-olive-600 rounded-lg">
                            <form onSubmit={async (e) => {
                              e.preventDefault();
                              const form = e.target as HTMLFormElement;
                              const formData = new FormData(form);
                              try {
                                const response = await fetch('/api/admin/budget/categories', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    name: formData.get('name'),
                                    estimated_amount: parseFloat(formData.get('estimated_amount') as string) || 0,
                                  }),
                                });
                                const data = await response.json();
                                if (!data.error) {
                                  setBudgetCategories(prev => [...prev, { ...data.category, spent: 0, paid: 0 }]);
                                  setShowAddCategory(false);
                                  form.reset();
                                }
                              } catch (err) { console.error(err); }
                            }} className="flex flex-wrap gap-3 items-end">
                              <div className="flex-1 min-w-[200px]">
                                <label className="text-olive-400 text-xs block mb-1">Category Name</label>
                                <input
                                  name="name"
                                  placeholder="e.g., Venue, Catering, Photography"
                                  required
                                  className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream"
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-olive-400 text-xs block mb-1">Budget Amount</label>
                                <input
                                  name="estimated_amount"
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream"
                                />
                              </div>
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add</button>
                              <button type="button" onClick={() => setShowAddCategory(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </form>
                          </div>
                        )}

                        {budgetCategories.length === 0 ? (
                          <div className="text-center py-8 text-olive-400">
                            No categories yet. Add categories to track your budget by type (Venue, Catering, etc.)
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {budgetCategories.map((category) => {
                              const percentSpent = category.estimated_amount > 0 ? (category.spent / category.estimated_amount) * 100 : 0;

                              if (editingCategoryId === category.id) {
                                // Edit mode
                                return (
                                  <div key={category.id} className="p-3 bg-olive-900/30 border border-olive-600 rounded-lg">
                                    <form onSubmit={async (e) => {
                                      e.preventDefault();
                                      const form = e.target as HTMLFormElement;
                                      const formData = new FormData(form);
                                      try {
                                        const response = await fetch('/api/admin/budget/categories', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            id: category.id,
                                            name: formData.get('name'),
                                            estimated_amount: parseFloat(formData.get('estimated_amount') as string) || 0,
                                          }),
                                        });
                                        const data = await response.json();
                                        if (!data.error) {
                                          setBudgetCategories(prev => prev.map(c =>
                                            c.id === category.id ? { ...data.category, spent: category.spent, paid: category.paid } : c
                                          ));
                                          setEditingCategoryId(null);
                                        }
                                      } catch (err) { console.error(err); }
                                    }} className="flex flex-wrap gap-3 items-end">
                                      <div className="flex-1 min-w-[150px]">
                                        <input
                                          name="name"
                                          defaultValue={category.name}
                                          required
                                          className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream"
                                        />
                                      </div>
                                      <div className="w-32">
                                        <input
                                          name="estimated_amount"
                                          type="number"
                                          step="0.01"
                                          defaultValue={category.estimated_amount}
                                          className="w-full px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream"
                                        />
                                      </div>
                                      <button type="submit" className="px-3 py-2 bg-gold-500 text-black rounded-lg font-medium text-sm">Save</button>
                                      <button type="button" onClick={() => setEditingCategoryId(null)} className="px-3 py-2 bg-olive-700 text-cream rounded-lg text-sm">Cancel</button>
                                    </form>
                                  </div>
                                );
                              }

                              return (
                                <div key={category.id} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-cream">{category.name}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-olive-400 text-sm">
                                        {formatCurrency(category.spent)} / {formatCurrency(category.estimated_amount)}
                                      </span>
                                      <input
                                        type="number"
                                        value={category.estimated_amount}
                                        onChange={(e) => updateCategoryBudget(category.id, parseFloat(e.target.value) || 0)}
                                        className="w-24 px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                      />
                                      <button
                                        onClick={() => setEditingCategoryId(category.id)}
                                        className="p-1 text-olive-400 hover:text-gold-400"
                                        title="Edit category"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (confirm(`Delete "${category.name}" category? This won't delete associated expenses.`)) {
                                            try {
                                              const response = await fetch('/api/admin/budget/categories', {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ id: category.id }),
                                              });
                                              const data = await response.json();
                                              if (!data.error) {
                                                setBudgetCategories(prev => prev.filter(c => c.id !== category.id));
                                              }
                                            } catch (err) { console.error(err); }
                                          }
                                        }}
                                        className="p-1 text-olive-400 hover:text-red-400"
                                        title="Delete category"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="h-2 bg-olive-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${percentSpent > 100 ? 'bg-red-500' : percentSpent > 80 ? 'bg-yellow-500' : 'bg-gold-500'}`}
                                      style={{ width: `${Math.min(percentSpent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expenses Sub-tab */}
                  {planningSubTab === 'expenses' && (
                    <div className="space-y-4">
                      {/* Expense Totals */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{formatCurrency(expenseTotals.totalAmount)}</div>
                          <div className="text-olive-400 text-sm">Total Amount</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-green-400">{formatCurrency(expenseTotals.totalPaid)}</div>
                          <div className="text-olive-400 text-sm">Total Paid</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-yellow-400">{formatCurrency(expenseTotals.totalBalance)}</div>
                          <div className="text-olive-400 text-sm">Balance Due</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{expenseTotals.countPending + expenseTotals.countPartial}</div>
                          <div className="text-olive-400 text-sm">Pending Payments</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-heading text-gold-400">Expenses</h3>
                        <button
                          onClick={() => setShowAddExpense(!showAddExpense)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Expense
                        </button>
                      </div>

                      {/* Add Expense Form */}
                      {showAddExpense && (
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            try {
                              const response = await fetch('/api/admin/expenses', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  description: formData.get('description'),
                                  amount: parseFloat(formData.get('amount') as string) || 0,
                                  amount_paid: parseFloat(formData.get('amount_paid') as string) || 0,
                                  category_id: formData.get('category_id') || null,
                                  vendor_id: formData.get('vendor_id') || null,
                                  payment_status: formData.get('payment_status') || 'pending',
                                  due_date: formData.get('due_date') || null,
                                }),
                              });
                              const data = await response.json();
                              if (!data.error) {
                                const newExpenses = [data.expense, ...expenses];
                                setExpenses(newExpenses);
                                recalculateExpenseTotals(newExpenses);
                                setShowAddExpense(false);
                                form.reset();
                              }
                            } catch (err) { console.error(err); }
                          }} className="grid md:grid-cols-4 gap-4">
                            <input name="description" placeholder="Description" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="amount" type="number" step="0.01" placeholder="Total Amount" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="amount_paid" type="number" step="0.01" placeholder="Amount Paid" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="category_id" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="">Select Category</option>
                              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select name="vendor_id" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="">Select Vendor</option>
                              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <input name="due_date" type="date" placeholder="Due Date" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <div className="md:col-span-2 flex gap-2">
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add Expense</button>
                              <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Expenses Table */}
                      {expenses.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">No expenses recorded yet</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-olive-700">
                                <th className="p-3 text-olive-300 font-medium">Description</th>
                                <th className="p-3 text-olive-300 font-medium">Amount</th>
                                <th className="p-3 text-olive-300 font-medium">Paid</th>
                                <th className="p-3 text-olive-300 font-medium">Balance</th>
                                <th className="p-3 text-olive-300 font-medium">Category</th>
                                <th className="p-3 text-olive-300 font-medium">Status</th>
                                <th className="p-3 text-olive-300 font-medium">Due</th>
                                <th className="p-3 text-olive-300 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenses.map((expense) => {
                                const balance = expense.amount - (expense.amount_paid || 0);

                                if (editingExpenseId === expense.id) {
                                  // Edit mode row
                                  return (
                                    <tr key={expense.id} className="border-b border-olive-800 bg-olive-900/50">
                                      <td colSpan={8} className="p-3">
                                        <form onSubmit={async (e) => {
                                          e.preventDefault();
                                          const form = e.target as HTMLFormElement;
                                          const formData = new FormData(form);
                                          const amountPaid = parseFloat(formData.get('amount_paid') as string) || 0;
                                          const amount = parseFloat(formData.get('amount') as string) || 0;
                                          let status: 'pending' | 'partial' | 'paid' = 'pending';
                                          if (amountPaid >= amount) status = 'paid';
                                          else if (amountPaid > 0) status = 'partial';

                                          await updateExpense(expense.id, {
                                            description: formData.get('description') as string,
                                            amount,
                                            amount_paid: amountPaid,
                                            category_id: formData.get('category_id') as string || null,
                                            payment_status: status,
                                            due_date: formData.get('due_date') as string || null,
                                            notes: formData.get('notes') as string || null,
                                          });
                                          setEditingExpenseId(null);
                                        }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div className="col-span-2">
                                            <label className="text-olive-400 text-xs">Description</label>
                                            <input
                                              name="description"
                                              defaultValue={expense.description}
                                              required
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Amount</label>
                                            <input
                                              name="amount"
                                              type="number"
                                              step="0.01"
                                              defaultValue={expense.amount}
                                              required
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Amount Paid</label>
                                            <input
                                              name="amount_paid"
                                              type="number"
                                              step="0.01"
                                              defaultValue={expense.amount_paid || 0}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Category</label>
                                            <select
                                              name="category_id"
                                              defaultValue={expense.category_id || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            >
                                              <option value="">No Category</option>
                                              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Due Date</label>
                                            <input
                                              name="due_date"
                                              type="date"
                                              defaultValue={expense.due_date || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div className="col-span-2 md:col-span-1">
                                            <label className="text-olive-400 text-xs">Notes</label>
                                            <input
                                              name="notes"
                                              defaultValue={expense.notes || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div className="col-span-2 md:col-span-1 flex items-end gap-2">
                                            <button type="submit" className="px-3 py-1 bg-gold-500 text-black rounded text-sm font-medium">
                                              Save
                                            </button>
                                            <button type="button" onClick={() => setEditingExpenseId(null)} className="px-3 py-1 bg-olive-700 text-cream rounded text-sm">
                                              Cancel
                                            </button>
                                          </div>
                                        </form>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={expense.id} className="border-b border-olive-800 hover:bg-olive-900/30">
                                    <td className="p-3 text-cream">{expense.description}</td>
                                    <td className="p-3 text-cream">{formatCurrency(expense.amount)}</td>
                                    <td className="p-3 text-green-400">{formatCurrency(expense.amount_paid || 0)}</td>
                                    <td className={`p-3 ${balance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{formatCurrency(balance)}</td>
                                    <td className="p-3 text-olive-400">{expense.category?.name || '-'}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        expense.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                        expense.payment_status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-olive-500/20 text-olive-400'
                                      }`}>{expense.payment_status}</span>
                                    </td>
                                    <td className="p-3 text-olive-400 text-sm">{formatShortDate(expense.due_date)}</td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setEditingExpenseId(expense.id)}
                                          className="px-2 py-1 text-xs bg-olive-700 text-cream hover:bg-olive-600 rounded"
                                        >
                                          Edit
                                        </button>
                                        {expense.payment_status !== 'paid' && (
                                          <button
                                            onClick={() => markExpensePaid(expense)}
                                            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded"
                                            title="Mark as fully paid"
                                          >
                                            Mark Paid
                                          </button>
                                        )}
                                        <button onClick={() => deleteExpense(expense.id)} className="text-red-400 hover:text-red-300">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vendors Sub-tab */}
                  {planningSubTab === 'vendors' && (
                    <div className="space-y-4">
                      {/* Vendor Totals */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{formatCurrency(vendorTotals.totalContracted)}</div>
                          <div className="text-olive-400 text-sm">Total Contracted</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-green-400">{formatCurrency(vendorTotals.totalPaid)}</div>
                          <div className="text-olive-400 text-sm">Total Paid</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-yellow-400">{formatCurrency(vendorTotals.totalBalance)}</div>
                          <div className="text-olive-400 text-sm">Balance Due</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{vendorTotals.countBooked}</div>
                          <div className="text-olive-400 text-sm">Booked Vendors</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-heading text-gold-400">Vendors</h3>
                        <button
                          onClick={() => setShowAddVendor(!showAddVendor)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Vendor
                        </button>
                      </div>

                      {/* Add Vendor Form */}
                      {showAddVendor && (
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            try {
                              const response = await fetch('/api/admin/vendors', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: formData.get('name'),
                                  category_id: formData.get('category_id') || null,
                                  contact_name: formData.get('contact_name') || null,
                                  email: formData.get('email') || null,
                                  phone: formData.get('phone') || null,
                                  contract_amount: parseFloat(formData.get('contract_amount') as string) || 0,
                                  amount_paid: parseFloat(formData.get('amount_paid') as string) || 0,
                                  status: formData.get('status') || 'researching',
                                }),
                              });
                              const data = await response.json();
                              if (!data.error) {
                                const newVendors = [data.vendor, ...vendors];
                                setVendors(newVendors);
                                recalculateVendorTotals(newVendors);
                                setShowAddVendor(false);
                                form.reset();
                              }
                            } catch (err) { console.error(err); }
                          }} className="grid md:grid-cols-3 gap-4">
                            <input name="name" placeholder="Vendor Name" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="category_id" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="">Select Category</option>
                              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input name="contact_name" placeholder="Contact Name" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="email" type="email" placeholder="Email" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="phone" placeholder="Phone" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="contract_amount" type="number" step="0.01" placeholder="Contract Amount" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="amount_paid" type="number" step="0.01" placeholder="Amount Paid" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="status" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="researching">Researching</option>
                              <option value="contacted">Contacted</option>
                              <option value="booked">Booked</option>
                              <option value="paid">Paid</option>
                              <option value="completed">Completed</option>
                            </select>
                            <div className="md:col-span-2 flex gap-2">
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add Vendor</button>
                              <button type="button" onClick={() => setShowAddVendor(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Vendors Grid */}
                      {vendors.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">No vendors added yet</div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {vendors.map((vendor) => (
                            <div key={vendor.id} className="bg-black/50 border border-olive-700 rounded-lg p-4">
                              {editingVendorId === vendor.id ? (
                                /* Editing Mode */
                                <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  const form = e.target as HTMLFormElement;
                                  const formData = new FormData(form);
                                  await updateVendor(vendor.id, {
                                    name: formData.get('name') as string,
                                    category_id: formData.get('category_id') as string || null,
                                    contact_name: formData.get('contact_name') as string || null,
                                    email: formData.get('email') as string || null,
                                    phone: formData.get('phone') as string || null,
                                    website: formData.get('website') as string || null,
                                    contract_amount: parseFloat(formData.get('contract_amount') as string) || 0,
                                    amount_paid: parseFloat(formData.get('amount_paid') as string) || 0,
                                    deposit_amount: parseFloat(formData.get('deposit_amount') as string) || 0,
                                    deposit_paid: formData.get('deposit_paid') === 'on',
                                    status: formData.get('status') as Vendor['status'],
                                    notes: formData.get('notes') as string || null,
                                  });
                                  setEditingVendorId(null);
                                }} className="space-y-3">
                                  <input
                                    name="name"
                                    defaultValue={vendor.name}
                                    placeholder="Vendor Name"
                                    required
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <select
                                    name="category_id"
                                    defaultValue={vendor.category_id || ''}
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  >
                                    <option value="">Select Category</option>
                                    {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                  <input
                                    name="contact_name"
                                    defaultValue={vendor.contact_name || ''}
                                    placeholder="Contact Name"
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <input
                                    name="email"
                                    type="email"
                                    defaultValue={vendor.email || ''}
                                    placeholder="Email"
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <input
                                    name="phone"
                                    defaultValue={vendor.phone || ''}
                                    placeholder="Phone"
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <input
                                    name="website"
                                    defaultValue={vendor.website || ''}
                                    placeholder="Website"
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-olive-400 text-xs">Contract Amount</label>
                                      <input
                                        name="contract_amount"
                                        type="number"
                                        step="0.01"
                                        defaultValue={vendor.contract_amount || 0}
                                        className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-olive-400 text-xs">Amount Paid</label>
                                      <input
                                        name="amount_paid"
                                        type="number"
                                        step="0.01"
                                        defaultValue={vendor.amount_paid || 0}
                                        className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-olive-400 text-xs">Deposit Amount</label>
                                      <input
                                        name="deposit_amount"
                                        type="number"
                                        step="0.01"
                                        defaultValue={vendor.deposit_amount || 0}
                                        className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                      />
                                    </div>
                                    <div className="flex items-end pb-1">
                                      <label className="flex items-center gap-2 text-olive-400 text-xs">
                                        <input
                                          name="deposit_paid"
                                          type="checkbox"
                                          defaultChecked={vendor.deposit_paid}
                                          className="rounded"
                                        />
                                        Deposit Paid
                                      </label>
                                    </div>
                                  </div>
                                  <select
                                    name="status"
                                    defaultValue={vendor.status}
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  >
                                    <option value="researching">Researching</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="booked">Booked</option>
                                    <option value="paid">Paid</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                  <textarea
                                    name="notes"
                                    defaultValue={vendor.notes || ''}
                                    placeholder="Notes"
                                    rows={2}
                                    className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button type="submit" className="flex-1 px-3 py-1.5 bg-gold-500 text-black rounded text-sm font-medium">
                                      Save
                                    </button>
                                    <button type="button" onClick={() => setEditingVendorId(null)} className="flex-1 px-3 py-1.5 bg-olive-700 text-cream rounded text-sm">
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                /* Display Mode */
                                <>
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="text-cream font-medium">{vendor.name}</h4>
                                      <p className="text-olive-400 text-sm">{vendor.category?.name || 'Uncategorized'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      vendor.status === 'booked' || vendor.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                      vendor.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                                      vendor.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                                      vendor.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                      'bg-olive-500/20 text-olive-400'
                                    }`}>{vendor.status}</span>
                                  </div>
                                  {vendor.contact_name && <p className="text-olive-400 text-sm">{vendor.contact_name}</p>}
                                  {vendor.email && <p className="text-olive-400 text-sm">{vendor.email}</p>}
                                  {vendor.phone && <p className="text-olive-400 text-sm">{vendor.phone}</p>}
                                  {vendor.website && (
                                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-gold-500 text-sm hover:underline block truncate">
                                      {vendor.website}
                                    </a>
                                  )}
                                  <div className="mt-3 pt-3 border-t border-olive-700">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-olive-400">Contract:</span>
                                      <span className="text-cream">{formatCurrency(vendor.contract_amount)}</span>
                                    </div>
                                    {vendor.deposit_amount > 0 && (
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="text-olive-400">Deposit:</span>
                                        <span className={vendor.deposit_paid ? 'text-green-400' : 'text-yellow-400'}>
                                          {formatCurrency(vendor.deposit_amount)} {vendor.deposit_paid ? '✓' : '(due)'}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-olive-400">Paid:</span>
                                      <span className="text-green-400">{formatCurrency(vendor.amount_paid || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                      <span className="text-olive-400">Balance:</span>
                                      <span className={vendor.contract_amount - (vendor.amount_paid || 0) > 0 ? 'text-yellow-400' : 'text-green-400'}>
                                        {formatCurrency(vendor.contract_amount - (vendor.amount_paid || 0))}
                                      </span>
                                    </div>
                                    {vendor.notes && (
                                      <p className="text-olive-400 text-xs mb-2 italic">{vendor.notes}</p>
                                    )}
                                    <div className="flex justify-between items-center gap-2">
                                      <button
                                        onClick={() => setEditingVendorId(vendor.id)}
                                        className="px-2 py-1 text-xs bg-olive-700 text-cream hover:bg-olive-600 rounded"
                                      >
                                        Edit
                                      </button>
                                      {vendor.status !== 'paid' && vendor.contract_amount > (vendor.amount_paid || 0) && (
                                        <button
                                          onClick={() => markVendorPaid(vendor)}
                                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded"
                                        >
                                          Mark Paid
                                        </button>
                                      )}
                                      {(vendor.status === 'paid' || vendor.contract_amount <= (vendor.amount_paid || 0)) && (
                                        <span className="text-green-400 text-xs">✓ Paid in Full</span>
                                      )}
                                      <button onClick={() => deleteVendor(vendor.id)} className="text-red-400 hover:text-red-300 ml-auto">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gifts Sub-tab */}
                  {planningSubTab === 'gifts' && (
                    <div className="space-y-4">
                      {/* Gift Stats */}
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-gold-500">{formatCurrency(giftTotals.totalCash)}</div>
                          <div className="text-olive-400 text-sm">Total Cash/Checks</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{giftTotals.totalGifts}</div>
                          <div className="text-olive-400 text-sm">Total Gifts</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-yellow-400">{giftTotals.thankYouPending}</div>
                          <div className="text-olive-400 text-sm">Thank Yous Pending</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-heading text-gold-400">Gift Registry</h3>
                        <button
                          onClick={() => setShowAddGift(!showAddGift)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Gift
                        </button>
                      </div>

                      {/* Add Gift Form */}
                      {showAddGift && (
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            try {
                              const response = await fetch('/api/admin/gifts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  giver_name: formData.get('giver_name'),
                                  giver_email: formData.get('giver_email') || null,
                                  gift_type: formData.get('gift_type') || 'cash',
                                  description: formData.get('description') || null,
                                  amount: parseFloat(formData.get('amount') as string) || null,
                                  received_date: formData.get('received_date') || null,
                                }),
                              });
                              const data = await response.json();
                              if (!data.error) {
                                setGifts(prev => [data.gift, ...prev]);
                                setGiftTotals(prev => ({
                                  ...prev,
                                  totalGifts: prev.totalGifts + 1,
                                  totalCash: prev.totalCash + (data.gift.gift_type === 'cash' || data.gift.gift_type === 'check' ? (data.gift.amount || 0) : 0),
                                  thankYouPending: prev.thankYouPending + 1,
                                }));
                                setShowAddGift(false);
                                form.reset();
                              }
                            } catch (err) { console.error(err); }
                          }} className="grid md:grid-cols-3 gap-4">
                            <input name="giver_name" placeholder="Giver Name" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="giver_email" type="email" placeholder="Email (optional)" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="gift_type" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="cash">Cash</option>
                              <option value="check">Check</option>
                              <option value="item">Physical Item</option>
                              <option value="registry">From Registry</option>
                              <option value="experience">Experience</option>
                              <option value="other">Other</option>
                            </select>
                            <input name="description" placeholder="Description" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="amount" type="number" step="0.01" placeholder="Amount (if monetary)" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="received_date" type="date" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <div className="md:col-span-3 flex gap-2">
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add Gift</button>
                              <button type="button" onClick={() => setShowAddGift(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Gifts Table */}
                      {gifts.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">No gifts recorded yet</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-olive-700">
                                <th className="p-3 text-olive-300 font-medium">From</th>
                                <th className="p-3 text-olive-300 font-medium">Type</th>
                                <th className="p-3 text-olive-300 font-medium">Description</th>
                                <th className="p-3 text-olive-300 font-medium">Amount</th>
                                <th className="p-3 text-olive-300 font-medium">Date</th>
                                <th className="p-3 text-olive-300 font-medium">Thank You</th>
                                <th className="p-3 text-olive-300 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gifts.map((gift) => {
                                if (editingGiftId === gift.id) {
                                  // Edit mode row
                                  return (
                                    <tr key={gift.id} className="border-b border-olive-800 bg-olive-900/50">
                                      <td colSpan={7} className="p-3">
                                        <form onSubmit={async (e) => {
                                          e.preventDefault();
                                          const form = e.target as HTMLFormElement;
                                          const formData = new FormData(form);
                                          await updateGift(gift.id, {
                                            giver_name: formData.get('giver_name') as string,
                                            gift_type: formData.get('gift_type') as Gift['gift_type'],
                                            description: (formData.get('description') as string) || undefined,
                                            amount: parseFloat(formData.get('amount') as string) || undefined,
                                            received_date: (formData.get('received_date') as string) || undefined,
                                            notes: (formData.get('notes') as string) || undefined,
                                          });
                                        }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div>
                                            <label className="text-olive-400 text-xs">From</label>
                                            <input
                                              name="giver_name"
                                              defaultValue={gift.giver_name}
                                              required
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Type</label>
                                            <select
                                              name="gift_type"
                                              defaultValue={gift.gift_type}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            >
                                              <option value="physical">Physical Gift</option>
                                              <option value="cash">Cash</option>
                                              <option value="check">Check</option>
                                              <option value="registry">Registry Item</option>
                                              <option value="experience">Experience</option>
                                              <option value="other">Other</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Description</label>
                                            <input
                                              name="description"
                                              defaultValue={gift.description || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Amount</label>
                                            <input
                                              name="amount"
                                              type="number"
                                              step="0.01"
                                              defaultValue={gift.amount || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-olive-400 text-xs">Date Received</label>
                                            <input
                                              name="received_date"
                                              type="date"
                                              defaultValue={gift.received_date || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="text-olive-400 text-xs">Notes</label>
                                            <input
                                              name="notes"
                                              defaultValue={gift.notes || ''}
                                              className="w-full px-2 py-1 bg-charcoal border border-olive-600 rounded text-cream text-sm"
                                            />
                                          </div>
                                          <div className="flex items-end gap-2">
                                            <button type="submit" className="px-3 py-1 bg-gold-500 text-black rounded text-sm font-medium">
                                              Save
                                            </button>
                                            <button type="button" onClick={() => setEditingGiftId(null)} className="px-3 py-1 bg-olive-700 text-cream rounded text-sm">
                                              Cancel
                                            </button>
                                          </div>
                                        </form>
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={gift.id} className="border-b border-olive-800 hover:bg-olive-900/30">
                                    <td className="p-3 text-cream">{gift.giver_name}</td>
                                    <td className="p-3 text-olive-400 capitalize">{gift.gift_type}</td>
                                    <td className="p-3 text-olive-400">{gift.description || '-'}</td>
                                    <td className="p-3 text-cream">{gift.amount ? formatCurrency(gift.amount) : '-'}</td>
                                    <td className="p-3 text-olive-400 text-sm">{formatShortDate(gift.received_date)}</td>
                                    <td className="p-3">
                                      <button
                                        onClick={() => toggleThankYou(gift)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          gift.thank_you_sent ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                        }`}
                                      >
                                        {gift.thank_you_sent ? 'Sent' : 'Mark Sent'}
                                      </button>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setEditingGiftId(gift.id)}
                                          className="px-2 py-1 text-xs bg-olive-700 text-cream hover:bg-olive-600 rounded"
                                        >
                                          Edit
                                        </button>
                                        <button onClick={() => deleteGift(gift.id)} className="text-red-400 hover:text-red-300">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks Sub-tab */}
                  {planningSubTab === 'tasks' && (
                    <div className="space-y-4">
                      {/* Task Stats */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-cream">{taskStats.total}</div>
                          <div className="text-olive-400 text-sm">Total Tasks</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-green-400">{taskStats.completed}</div>
                          <div className="text-olive-400 text-sm">Completed</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-red-400">{taskStats.overdue}</div>
                          <div className="text-olive-400 text-sm">Overdue</div>
                        </div>
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4 text-center">
                          <div className="text-2xl font-heading text-yellow-400">{taskStats.upcoming}</div>
                          <div className="text-olive-400 text-sm">Due This Week</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-heading text-gold-400">Wedding Checklist</h3>
                        <button
                          onClick={() => setShowAddTask(!showAddTask)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Task
                        </button>
                      </div>

                      {/* Add Task Form */}
                      {showAddTask && (
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            try {
                              const response = await fetch('/api/admin/tasks', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  title: formData.get('title'),
                                  description: formData.get('description') || null,
                                  category_id: formData.get('category_id') || null,
                                  due_date: formData.get('due_date') || null,
                                  priority: formData.get('priority') || 'medium',
                                  assigned_to: formData.get('assigned_to') || null,
                                }),
                              });
                              const data = await response.json();
                              if (!data.error) {
                                setTasks(prev => [data.task, ...prev]);
                                setTaskStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
                                setShowAddTask(false);
                                form.reset();
                              }
                            } catch (err) { console.error(err); }
                          }} className="grid md:grid-cols-3 gap-4">
                            <input name="title" placeholder="Task Title" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                            <select name="priority" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="low">Low Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="high">High Priority</option>
                              <option value="urgent">Urgent</option>
                            </select>
                            <input name="description" placeholder="Description (optional)" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                            <input name="due_date" type="date" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="category_id" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="">Select Category</option>
                              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select name="assigned_to" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="">Assign To</option>
                              <option value="nate">Nate</option>
                              <option value="blake">Blake</option>
                              <option value="both">Both</option>
                            </select>
                            <div className="flex gap-2">
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add Task</button>
                              <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Tasks List */}
                      {tasks.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">No tasks added yet</div>
                      ) : (
                        <div className="space-y-2">
                          {tasks.map((task) => {
                            const isOverdue = task.due_date && !task.completed && new Date(task.due_date) < new Date();

                            if (editingTaskId === task.id) {
                              // Edit mode
                              return (
                                <div key={task.id} className="bg-black/50 border border-olive-600 rounded-lg p-4">
                                  <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const formData = new FormData(form);
                                    await updateTask(task.id, {
                                      title: formData.get('title') as string,
                                      description: formData.get('description') as string || null,
                                      category_id: formData.get('category_id') as string || null,
                                      due_date: formData.get('due_date') as string || null,
                                      priority: formData.get('priority') as Task['priority'],
                                      assigned_to: formData.get('assigned_to') as string || null,
                                    });
                                  }} className="grid md:grid-cols-3 gap-3">
                                    <input
                                      name="title"
                                      defaultValue={task.title}
                                      placeholder="Task Title"
                                      required
                                      className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2"
                                    />
                                    <select name="priority" defaultValue={task.priority} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                                      <option value="low">Low Priority</option>
                                      <option value="medium">Medium Priority</option>
                                      <option value="high">High Priority</option>
                                      <option value="urgent">Urgent</option>
                                    </select>
                                    <input
                                      name="description"
                                      defaultValue={task.description || ''}
                                      placeholder="Description (optional)"
                                      className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2"
                                    />
                                    <input
                                      name="due_date"
                                      type="date"
                                      defaultValue={task.due_date || ''}
                                      className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream"
                                    />
                                    <select name="category_id" defaultValue={task.category_id || ''} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                                      <option value="">Select Category</option>
                                      {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select name="assigned_to" defaultValue={task.assigned_to || ''} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                                      <option value="">Assign To</option>
                                      <option value="nate">Nate</option>
                                      <option value="blake">Blake</option>
                                      <option value="both">Both</option>
                                    </select>
                                    <div className="flex gap-2">
                                      <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Save</button>
                                      <button type="button" onClick={() => setEditingTaskId(null)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                                    </div>
                                  </form>
                                </div>
                              );
                            }

                            return (
                              <div key={task.id} className={`bg-black/50 border rounded-lg p-4 flex items-start gap-4 ${
                                task.completed ? 'border-olive-800 opacity-60' : isOverdue ? 'border-red-500/50' : 'border-olive-700'
                              }`}>
                                <button
                                  onClick={() => toggleTaskComplete(task)}
                                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    task.completed ? 'bg-green-500 border-green-500' : 'border-olive-500 hover:border-gold-400'
                                  }`}
                                >
                                  {task.completed && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${task.completed ? 'text-olive-400 line-through' : 'text-cream'}`}>{task.title}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                      task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                      task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-olive-500/20 text-olive-400'
                                    }`}>{task.priority}</span>
                                    {task.assigned_to && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 capitalize">{task.assigned_to}</span>
                                    )}
                                  </div>
                                  {task.description && <p className="text-olive-400 text-sm mt-1">{task.description}</p>}
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    {task.category && <span className="text-olive-400">{task.category.name}</span>}
                                    {task.due_date && (
                                      <span className={isOverdue ? 'text-red-400' : 'text-olive-400'}>
                                        Due: {formatShortDate(task.due_date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingTaskId(task.id)}
                                    className="px-2 py-1 text-xs bg-olive-700 text-cream hover:bg-olive-600 rounded"
                                  >
                                    Edit
                                  </button>
                                  <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline Sub-tab */}
                  {planningSubTab === 'timeline' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <h3 className="text-lg font-heading text-gold-400">Wedding Day Timeline</h3>
                          <p className="text-olive-400 text-sm">{timelineEvents.length} events • {timelineEvents.filter(e => e.is_milestone).length} key moments</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={exportTimelinePDF}
                            className="flex items-center gap-2 px-3 py-1.5 bg-olive-700 text-cream rounded-lg hover:bg-olive-600 transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export PDF
                          </button>
                          <button
                            onClick={() => setShowAddTimeline(!showAddTimeline)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition-colors text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Event
                          </button>
                        </div>
                      </div>

                      {/* Add Timeline Event Form */}
                      {showAddTimeline && (
                        <div className="bg-black/50 border border-olive-700 rounded-lg p-4">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            try {
                              const response = await fetch('/api/admin/timeline', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  title: formData.get('title'),
                                  event_date: formData.get('event_date') || '2027-10-31',
                                  start_time: formData.get('start_time'),
                                  end_time: formData.get('end_time') || null,
                                  location: formData.get('location') || null,
                                  responsible_person: formData.get('responsible_person') || null,
                                  category: formData.get('category') || 'other',
                                  is_milestone: formData.get('is_milestone') === 'on',
                                  notes: formData.get('notes') || null,
                                  staff_notes: formData.get('staff_notes') || null,
                                }),
                              });
                              const data = await response.json();
                              if (!data.error) {
                                setTimelineEvents(prev => [...prev, data.event].sort((a, b) => a.start_time.localeCompare(b.start_time)));
                                setShowAddTimeline(false);
                                form.reset();
                              }
                            } catch (err) { console.error(err); }
                          }} className="grid md:grid-cols-4 gap-4">
                            <input name="title" placeholder="Event Title" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                            <select name="event_date" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="2027-10-30">Oct 30 - Rehearsal</option>
                              <option value="2027-10-31" selected>Oct 31 - Wedding Day</option>
                              <option value="2027-11-01">Nov 1 - After Midnight</option>
                            </select>
                            <div></div>
                            <input name="start_time" type="time" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="end_time" type="time" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="location" placeholder="Location" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <input name="responsible_person" placeholder="Responsible Person" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                            <select name="category" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                              <option value="preparation">Preparation</option>
                              <option value="ceremony">Ceremony</option>
                              <option value="cocktail_hour">Cocktail Hour</option>
                              <option value="reception">Reception</option>
                              <option value="photos">Photos</option>
                              <option value="transportation">Transportation</option>
                              <option value="vendor_arrival">Vendor Arrival</option>
                              <option value="other">Other</option>
                            </select>
                            <label className="flex items-center gap-2 text-cream">
                              <input name="is_milestone" type="checkbox" className="w-4 h-4 rounded border-olive-600 text-gold-500 focus:ring-gold-500 bg-charcoal" />
                              Key Moment
                            </label>
                            <input name="notes" placeholder="Notes (visible to all)" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                            <input name="staff_notes" placeholder="Staff Notes (private)" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                            <div className="md:col-span-4 flex gap-2">
                              <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Add Event</button>
                              <button type="button" onClick={() => setShowAddTimeline(false)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Timeline Display */}
                      {timelineEvents.length === 0 ? (
                        <div className="text-center py-12 text-olive-400">No timeline events yet. Add your wedding day schedule!</div>
                      ) : (
                        <div className="space-y-4">
                          {/* Group events by date */}
                          {Object.entries(
                            timelineEvents.reduce((acc, event) => {
                              const date = event.event_date || '2027-10-31';
                              if (!acc[date]) acc[date] = [];
                              acc[date].push(event);
                              return acc;
                            }, {} as Record<string, TimelineEvent[]>)
                          ).sort(([a], [b]) => a.localeCompare(b)).map(([date, events]) => (
                            <div key={date} className="space-y-2">
                              {/* Date Header */}
                              <div className="sticky top-0 bg-charcoal/95 backdrop-blur py-2 px-3 rounded-lg border border-olive-600 z-10">
                                <h4 className="text-gold-400 font-semibold">
                                  {date === '2027-10-30' && 'Friday, October 30 — Rehearsal'}
                                  {date === '2027-10-31' && 'Saturday, October 31 — Wedding Day'}
                                  {date === '2027-11-01' && 'Sunday, November 1 — After Midnight'}
                                  {!['2027-10-30', '2027-10-31', '2027-11-01'].includes(date) && new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h4>
                              </div>
                              {/* Events for this date */}
                              {events.map((event) => (
                            <div
                              key={event.id}
                              className={`bg-black/50 border rounded-lg p-4 ${
                                event.is_milestone ? 'border-gold-400 bg-gold-500/10' : 'border-olive-700'
                              }`}
                            >
                              {editingTimelineId === event.id ? (
                                /* Edit Mode */
                                <form onSubmit={async (e) => {
                                  e.preventDefault();
                                  const form = e.target as HTMLFormElement;
                                  const formData = new FormData(form);
                                  await updateTimelineEvent(event.id, {
                                    title: formData.get('title') as string,
                                    event_date: formData.get('event_date') as string,
                                    start_time: formData.get('start_time') as string,
                                    end_time: (formData.get('end_time') as string) || null,
                                    location: (formData.get('location') as string) || null,
                                    responsible_person: (formData.get('responsible_person') as string) || null,
                                    category: formData.get('category') as TimelineEvent['category'],
                                    notes: (formData.get('notes') as string) || null,
                                    staff_notes: (formData.get('staff_notes') as string) || null,
                                  });
                                }} className="space-y-3">
                                  <div className="grid md:grid-cols-4 gap-3">
                                    <input name="title" defaultValue={event.title} placeholder="Event Title" required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                                    <select name="event_date" defaultValue={event.event_date || '2027-10-31'} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                                      <option value="2027-10-30">Oct 30 - Rehearsal</option>
                                      <option value="2027-10-31">Oct 31 - Wedding Day</option>
                                      <option value="2027-11-01">Nov 1 - After Midnight</option>
                                    </select>
                                    <select name="category" defaultValue={event.category} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream">
                                      <option value="preparation">Preparation</option>
                                      <option value="ceremony">Ceremony</option>
                                      <option value="cocktail_hour">Cocktail Hour</option>
                                      <option value="reception">Reception</option>
                                      <option value="photos">Photos</option>
                                      <option value="transportation">Transportation</option>
                                      <option value="vendor_arrival">Vendor Arrival</option>
                                      <option value="other">Other</option>
                                    </select>
                                    <input name="start_time" type="time" defaultValue={event.start_time} required className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                                    <input name="end_time" type="time" defaultValue={event.end_time || ''} className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                                    <input name="location" defaultValue={event.location || ''} placeholder="Location" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                                    <input name="responsible_person" defaultValue={event.responsible_person || ''} placeholder="Responsible Person" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream" />
                                    <input name="notes" defaultValue={event.notes || ''} placeholder="Notes" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                                    <input name="staff_notes" defaultValue={event.staff_notes || ''} placeholder="Staff Notes" className="px-3 py-2 bg-charcoal border border-olive-600 rounded-lg text-cream md:col-span-2" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button type="submit" className="px-4 py-2 bg-gold-500 text-black rounded-lg font-medium">Save</button>
                                    <button type="button" onClick={() => setEditingTimelineId(null)} className="px-4 py-2 bg-olive-700 text-cream rounded-lg">Cancel</button>
                                  </div>
                                </form>
                              ) : (
                                /* View Mode */
                                <div className="flex items-start gap-4">
                                  {/* Time Column */}
                                  <div className="w-24 flex-shrink-0 text-center">
                                    <div className="text-gold-400 font-medium">{formatTime(event.start_time)}</div>
                                    {event.end_time && (
                                      <div className="text-olive-400 text-sm">to {formatTime(event.end_time)}</div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-cream font-medium">{event.title}</span>
                                      {event.is_milestone && (
                                        <span className="px-2 py-0.5 rounded text-xs bg-gold-500/30 text-gold-300 border border-gold-400 font-medium">
                                          Key Moment
                                        </span>
                                      )}
                                      <span className={`px-2 py-0.5 rounded text-xs border ${getCategoryColor(event.category)}`}>
                                        {getCategoryLabel(event.category)}
                                      </span>
                                    </div>
                                    {event.location && (
                                      <div className="text-olive-400 text-sm mt-1">
                                        📍 {event.location}
                                        {event.location_notes && <span className="text-olive-400"> ({event.location_notes})</span>}
                                      </div>
                                    )}
                                    {event.responsible_person && (
                                      <div className="text-olive-400 text-sm">👤 {event.responsible_person}</div>
                                    )}
                                    {event.vendor && (
                                      <div className="text-olive-400 text-sm">
                                        🏢 {event.vendor.name}
                                        {event.vendor.phone && <span className="text-olive-400"> | {event.vendor.phone}</span>}
                                      </div>
                                    )}
                                    {event.notes && (
                                      <div className="text-olive-400 text-sm mt-1 italic">{event.notes}</div>
                                    )}
                                    {event.staff_notes && (
                                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                                        <strong>Staff:</strong> {event.staff_notes}
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => setEditingTimelineId(event.id)}
                                      className="p-1.5 text-olive-400 hover:text-cream"
                                      title="Edit event"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => toggleMilestone(event)}
                                      className={`p-1.5 rounded ${event.is_milestone ? 'text-gold-400' : 'text-olive-400 hover:text-gold-400'}`}
                                      title={event.is_milestone ? 'Remove milestone' : 'Mark as milestone'}
                                    >
                                      <svg className="w-5 h-5" fill={event.is_milestone ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteTimelineEvent(event.id)}
                                      className="p-1.5 text-red-400 hover:text-red-300"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
