import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAuditErrorDetails, logAdminAuditEvent } from '@/lib/admin-audit';

const BUCKET_NAME = 'wedding';

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate URLs for all photos
    const photosWithUrls = (data || []).map((photo) => {
      const { data: urlData } = supabase!.storage
        .from(BUCKET_NAME)
        .getPublicUrl(photo.file_path);

      return {
        ...photo,
        url: urlData.publicUrl,
      };
    });

    return NextResponse.json({ photos: photosWithUrls });
  } catch (error) {
    console.error('Admin photos fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// Toggle photo visibility
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let id: string | undefined;
  let isVisible: boolean | undefined;

  try {
    const body = await request.json();
    id = body.id;
    isVisible = body.is_visible;

    const { error } = await supabase
      .from('photos')
      .update({ is_visible: isVisible })
      .eq('id', id);

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: 'update_visibility',
      entity: 'photo',
      entityId: id,
      status: 'success',
      details: { is_visible: isVisible },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin photo update error:', error);
    await logAdminAuditEvent({
      request,
      action: 'update_visibility',
      entity: 'photo',
      entityId: id,
      status: 'failure',
      details: { is_visible: isVisible, ...getAuditErrorDetails(error) },
    });
    return NextResponse.json(
      { error: 'Failed to update photo' },
      { status: 500 }
    );
  }
}

// Delete photo
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let id: string | undefined;
  let filePath: string | undefined;

  try {
    const body = await request.json();
    id = body.id;
    filePath = body.file_path;

    // Delete from storage
    if (filePath) {
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    }

    // Delete from database
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'photo',
      entityId: id,
      status: 'success',
      details: { file_path: filePath },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin photo delete error:', error);
    await logAdminAuditEvent({
      request,
      action: 'delete',
      entity: 'photo',
      entityId: id,
      status: 'failure',
      details: { file_path: filePath, ...getAuditErrorDetails(error) },
    });
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
