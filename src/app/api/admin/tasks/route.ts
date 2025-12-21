import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  refreshAccessToken,
  createTodoTask,
  updateTodoTask,
  deleteTodoTask,
  toMicrosoftTask,
} from '@/lib/microsoft-graph';

interface MicrosoftAuth {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  todo_list_id: string;
}

/**
 * Get valid Microsoft access token (refresh if needed)
 * Returns null if not connected to Microsoft
 */
async function getMicrosoftAuth(): Promise<{ token: string; listId: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data: auth, error } = await supabase
      .from('microsoft_auth')
      .select('*')
      .single();

    if (error || !auth) return null;

    const msAuth = auth as MicrosoftAuth;
    const expiresAt = new Date(msAuth.expires_at);

    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const newTokens = await refreshAccessToken(msAuth.refresh_token);

      await supabase
        .from('microsoft_auth')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', auth.id);

      return { token: newTokens.access_token, listId: msAuth.todo_list_id };
    }

    return { token: msAuth.access_token, listId: msAuth.todo_list_id };
  } catch {
    return null;
  }
}

// Get all tasks
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Calculate stats
    const totalTasks = data?.length || 0;
    const completedTasks = data?.filter(t => t.completed).length || 0;
    const overdueTasks = data?.filter(t => {
      if (t.completed || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length || 0;
    const upcomingTasks = data?.filter(t => {
      if (t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate >= today && dueDate <= weekFromNow;
    }).length || 0;

    return NextResponse.json({
      tasks: data || [],
      stats: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        overdue: overdueTasks,
        upcoming: upcomingTasks,
      },
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// Create a new task
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      category_id,
      due_date,
      priority,
      assigned_to,
      notes,
    } = body;

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('tasks')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        category_id: category_id || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        assigned_to: assigned_to || null,
        notes: notes || null,
        sort_order: (maxOrder?.sort_order || 0) + 1,
      })
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .single();

    if (error) throw error;

    // Sync to Microsoft To Do if connected
    const msAuth = await getMicrosoftAuth();
    if (msAuth && data) {
      try {
        const msTask = await createTodoTask(
          msAuth.token,
          msAuth.listId,
          toMicrosoftTask(data)
        );

        // Update local task with Microsoft ID
        await supabase
          .from('tasks')
          .update({
            microsoft_todo_id: msTask.id,
            microsoft_list_id: msAuth.listId,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        data.microsoft_todo_id = msTask.id;
      } catch (msError) {
        console.error('Failed to sync task to Microsoft:', msError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// Update a task
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    // If marking as completed and no completed_date provided, set it to today
    if (updates.completed === true && !updates.completed_date) {
      updates.completed_date = new Date().toISOString().split('T')[0];
    }
    // If unmarking as completed, clear the completed_date
    if (updates.completed === false) {
      updates.completed_date = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:budget_categories(id, name, icon)
      `)
      .single();

    if (error) throw error;

    // Sync to Microsoft To Do if connected and task is linked
    const msAuth = await getMicrosoftAuth();
    if (msAuth && data?.microsoft_todo_id) {
      try {
        await updateTodoTask(
          msAuth.token,
          data.microsoft_list_id || msAuth.listId,
          data.microsoft_todo_id,
          toMicrosoftTask(data)
        );

        // Update sync timestamp
        await supabase
          .from('tasks')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', data.id);
      } catch (msError) {
        console.error('Failed to sync task update to Microsoft:', msError);
      }
    }

    return NextResponse.json({ task: data });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// Delete a task
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await request.json();

    // Get task to check for Microsoft ID before deleting
    const { data: task } = await supabase
      .from('tasks')
      .select('microsoft_todo_id, microsoft_list_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Delete from Microsoft To Do if connected
    const msAuth = await getMicrosoftAuth();
    if (msAuth && task?.microsoft_todo_id) {
      try {
        await deleteTodoTask(
          msAuth.token,
          task.microsoft_list_id || msAuth.listId,
          task.microsoft_todo_id
        );
      } catch (msError) {
        console.error('Failed to delete task from Microsoft:', msError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
