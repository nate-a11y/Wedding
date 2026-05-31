import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

type ParsedGuestRow = {
  row: number;
  name: string;
  email: string;
  phone: string | null;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  status: 'ready' | 'duplicate' | 'invalid';
  issues: string[];
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function getValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) return value.trim();
  }
  return '';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseGuestCsv(csv: string, existingEmails: Set<string>) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [] as ParsedGuestRow[];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const seenEmails = new Set<string>();

  return lines.slice(1, 501).map((line, index) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, i) => [header, values[i] || '']));
    const email = normalizeEmail(getValue(record, ['email', 'email_address']));
    const row: ParsedGuestRow = {
      row: index + 2,
      name: getValue(record, ['name', 'full_name', 'guest_name']),
      email,
      phone: getValue(record, ['phone', 'phone_number', 'mobile']) || null,
      street_address: getValue(record, ['street_address', 'address', 'address_1', 'street']),
      street_address_2: getValue(record, ['street_address_2', 'address_2', 'apt', 'suite']) || null,
      city: getValue(record, ['city']),
      state: getValue(record, ['state', 'province', 'region']) || null,
      postal_code: getValue(record, ['postal_code', 'zip', 'zip_code', 'postcode']),
      country: getValue(record, ['country']) || 'United States',
      status: 'ready',
      issues: [],
    };

    if (!row.name) row.issues.push('Missing name');
    if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) row.issues.push('Invalid email');
    if (!row.street_address) row.issues.push('Missing street address');
    if (!row.city) row.issues.push('Missing city');
    if (!row.postal_code) row.issues.push('Missing postal code');
    if (existingEmails.has(row.email)) row.issues.push('Already in address book');
    if (seenEmails.has(row.email)) row.issues.push('Duplicate in CSV');
    if (row.email) seenEmails.add(row.email);

    row.status = row.issues.length === 0
      ? 'ready'
      : row.issues.some((issue) => issue.includes('Duplicate') || issue.includes('Already'))
        ? 'duplicate'
        : 'invalid';

    return row;
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { csv, apply = false } = await request.json();
    if (typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ error: 'CSV text is required' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('guest_addresses')
      .select('email');
    if (existingError) throw existingError;

    const existingEmails = new Set((existing || []).map((row) => normalizeEmail(row.email)));
    const rows = parseGuestCsv(csv, existingEmails);
    const readyRows = rows.filter((row) => row.status === 'ready');

    let inserted = 0;
    if (apply && readyRows.length > 0) {
      const { error } = await supabase.from('guest_addresses').insert(
        readyRows.map((row) => ({
          name: row.name,
          email: row.email,
          phone: row.phone,
          street_address: row.street_address,
          street_address_2: row.street_address_2,
          city: row.city,
          state: row.state,
          postal_code: row.postal_code,
          country: row.country,
        }))
      );
      if (error) throw error;
      inserted = readyRows.length;
    }

    await logAdminAuditEvent({
      request,
      action: apply ? 'import' : 'preview_import',
      entity: 'guest_address',
      status: 'success',
      details: { rows: rows.length, ready: readyRows.length, inserted },
    });

    return NextResponse.json({
      success: true,
      applied: Boolean(apply),
      inserted,
      summary: {
        total: rows.length,
        ready: readyRows.length,
        duplicate: rows.filter((row) => row.status === 'duplicate').length,
        invalid: rows.filter((row) => row.status === 'invalid').length,
      },
      rows: rows.slice(0, 100),
    });
  } catch (error) {
    console.error('Guest import preview error:', error);
    await logAdminAuditEvent({
      request,
      action: 'import',
      entity: 'guest_address',
      status: 'failure',
      details: getAuditErrorDetails(error),
    });
    return NextResponse.json({ error: 'Failed to process guest import' }, { status: 500 });
  }
}
