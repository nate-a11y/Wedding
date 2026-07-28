import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase-server';
import { getLivestreamSettings, serializeLivestreamState } from '@/lib/livestream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Current livestream state for the guest-facing page
export async function GET() {
  try {
    const settings = isSupabaseConfigured() ? await getLivestreamSettings() : null;
    return NextResponse.json(serializeLivestreamState(settings));
  } catch (error) {
    console.error('Livestream state error:', error);
    return NextResponse.json(serializeLivestreamState(null));
  }
}
