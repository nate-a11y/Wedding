import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getWelcomeVideoUrl } from '@/lib/welcome-video';
import { logAdminAuditEvent } from '@/lib/admin-audit';
import { adminAddressCreateSchema, adminAddressUpdateSchema, adminAddressDeleteSchema, parseJsonRequest } from '@/lib/validation';

const addressSelect = '*, rsvps:linked_rsvp_id (id, name, attending, created_at)';
const unavailable = () => NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;
  if (!isSupabaseConfigured() || !supabase) return unavailable();

  try {
    const { data, error } = await supabase.from('guest_addresses').select(addressSelect).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ addresses: (data || []).map(address => ({ ...address, welcome_video_url: getWelcomeVideoUrl(address.name) })) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

async function saveAddress(request: NextRequest, updating: boolean) {
  const authError = await requireAdminAuth();
  if (authError) return authError;
  if (!isSupabaseConfigured() || !supabase) return unavailable();

  const parsed = await parseJsonRequest(request, updating ? adminAddressUpdateSchema : adminAddressCreateSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  const id = 'id' in body && typeof body.id === 'string' ? body.id : undefined;
  const payload = {
    name: body.name, email: body.email, phone: body.phone || null,
    street_address: body.street_address, street_address_2: body.street_address_2 || null,
    city: body.city, state: body.state || null, postal_code: body.postal_code, country: body.country,
  };
  const action = updating ? 'address.update' : 'address.create';
  try {
    let query;
    if ('updated_at' in body) {
      const update = supabase.from('guest_addresses').update(payload).eq('id', id!);
      // Prevent overwriting an address changed by a guest or another admin since the editor opened.
      query = body.updated_at === null ? update.is('updated_at', null) : update.eq('updated_at', body.updated_at);
    } else {
      query = supabase.from('guest_addresses').insert(payload);
    }
    const { data, error } = await query.select(addressSelect).maybeSingle();
    if (error) {
      await logAdminAuditEvent({ request, action, entity: 'guest_addresses', entityId: id, status: 'failure', details: { code: error.code } });
      return NextResponse.json({ error: error.code === '23505' ? 'An address already exists for this email. Edit that record instead.' : 'Failed to save address.' }, { status: error.code === '23505' ? 409 : 500 });
    }
    if (!data) return NextResponse.json({ error: 'This address changed or was deleted. Refresh Addresses before editing again.' }, { status: 409 });
    await logAdminAuditEvent({ request, action, entity: 'guest_addresses', entityId: data.id, status: 'success' });
    return NextResponse.json({ address: { ...data, welcome_video_url: getWelcomeVideoUrl(data.name) } }, { status: updating ? 200 : 201 });
  } catch {
    await logAdminAuditEvent({ request, action, entity: 'guest_addresses', entityId: id, status: 'failure' });
    return NextResponse.json({ error: 'Failed to save address.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return saveAddress(request, false); }
export async function PATCH(request: NextRequest) { return saveAddress(request, true); }

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;
  if (!isSupabaseConfigured() || !supabase) return unavailable();
  const parsed = await parseJsonRequest(request, adminAddressDeleteSchema);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;
  try {
    const { data, error } = await supabase.from('guest_addresses').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Address not found. Refresh Addresses.' }, { status: 404 });
    await logAdminAuditEvent({ request, action: 'address.delete', entity: 'guest_addresses', entityId: id, status: 'success' });
    return NextResponse.json({ success: true });
  } catch {
    await logAdminAuditEvent({ request, action: 'address.delete', entity: 'guest_addresses', entityId: id, status: 'failure' });
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
