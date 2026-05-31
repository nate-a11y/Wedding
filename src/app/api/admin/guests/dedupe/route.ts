import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

type AddressRow = {
  id: string;
  name: string;
  email: string;
  linked_rsvp_id: string | null;
  created_at: string;
};

type RsvpRow = {
  id: string;
  name: string;
  email: string;
  attending: boolean;
  created_at: string;
};

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

function normalizeName(name?: string | null) {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function loadGuestRows() {
  if (!supabase) return { addresses: [] as AddressRow[], rsvps: [] as RsvpRow[] };
  const [addressesResult, rsvpsResult] = await Promise.all([
    supabase
      .from('guest_addresses')
      .select('id, name, email, linked_rsvp_id, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('rsvps')
      .select('id, name, email, attending, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (addressesResult.error) throw addressesResult.error;
  if (rsvpsResult.error) throw rsvpsResult.error;

  return {
    addresses: (addressesResult.data || []) as AddressRow[],
    rsvps: (rsvpsResult.data || []) as RsvpRow[],
  };
}

function buildAnalysis(addresses: AddressRow[], rsvps: RsvpRow[]) {
  const byEmail = new Map<string, { email: string; addresses: AddressRow[]; rsvps: RsvpRow[] }>();
  const byName = new Map<string, { name: string; addresses: AddressRow[]; rsvps: RsvpRow[] }>();

  for (const address of addresses) {
    const email = normalizeEmail(address.email);
    if (email) {
      if (!byEmail.has(email)) byEmail.set(email, { email, addresses: [], rsvps: [] });
      byEmail.get(email)?.addresses.push(address);
    }
    const name = normalizeName(address.name);
    if (name) {
      if (!byName.has(name)) byName.set(name, { name, addresses: [], rsvps: [] });
      byName.get(name)?.addresses.push(address);
    }
  }

  for (const rsvp of rsvps) {
    const email = normalizeEmail(rsvp.email);
    if (email) {
      if (!byEmail.has(email)) byEmail.set(email, { email, addresses: [], rsvps: [] });
      byEmail.get(email)?.rsvps.push(rsvp);
    }
    const name = normalizeName(rsvp.name);
    if (name) {
      if (!byName.has(name)) byName.set(name, { name, addresses: [], rsvps: [] });
      byName.get(name)?.rsvps.push(rsvp);
    }
  }

  const duplicateEmails = [...byEmail.values()]
    .filter((group) => group.addresses.length + group.rsvps.length > 1)
    .slice(0, 25);

  const duplicateNames = [...byName.values()]
    .filter((group) => group.addresses.length + group.rsvps.length > 1)
    .filter((group) => !byEmail.has(group.name))
    .slice(0, 25);

  const linkableExactEmailMatches = [...byEmail.values()]
    .flatMap((group) => {
      if (group.rsvps.length !== 1) return [];
      return group.addresses
        .filter((address) => !address.linked_rsvp_id)
        .map((address) => ({ address, rsvp: group.rsvps[0] }));
    });

  return {
    stats: {
      addresses: addresses.length,
      rsvps: rsvps.length,
      duplicateEmailGroups: duplicateEmails.length,
      duplicateNameGroups: duplicateNames.length,
      linkableExactEmailMatches: linkableExactEmailMatches.length,
    },
    duplicateEmails,
    duplicateNames,
    linkableExactEmailMatches: linkableExactEmailMatches.slice(0, 50),
  };
}

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { addresses, rsvps } = await loadGuestRows();
    return NextResponse.json(buildAnalysis(addresses, rsvps));
  } catch (error) {
    console.error('Guest dedupe analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze guests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'link_exact_email') {
      return NextResponse.json({ error: 'Unsupported dedupe action' }, { status: 400 });
    }

    const { addresses, rsvps } = await loadGuestRows();
    const analysis = buildAnalysis(addresses, rsvps);
    let linked = 0;

    for (const match of analysis.linkableExactEmailMatches) {
      const { error } = await supabase
        .from('guest_addresses')
        .update({ linked_rsvp_id: match.rsvp.id })
        .eq('id', match.address.id)
        .is('linked_rsvp_id', null);
      if (error) throw error;
      linked += 1;
    }

    await logAdminAuditEvent({
      request,
      action: 'link_exact_email',
      entity: 'guest',
      status: 'success',
      details: { linked },
    });

    const refreshed = await loadGuestRows();
    return NextResponse.json({ success: true, linked, ...buildAnalysis(refreshed.addresses, refreshed.rsvps) });
  } catch (error) {
    console.error('Guest dedupe link error:', error);
    await logAdminAuditEvent({
      request,
      action: 'link_exact_email',
      entity: 'guest',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'Failed to link guests' }, { status: 500 });
  }
}
