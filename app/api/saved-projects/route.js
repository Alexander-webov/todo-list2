import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/saved-projects
// body: { project_id }
export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  if (!body.project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from('saved_projects').insert({
    user_id: user.id,
    project_id: body.project_id,
  });

  // Дубль — не ошибка, просто уже сохранено
  if (error && !error.message?.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/saved-projects?project_id=XX
export async function DELETE(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const db = supabaseAdmin();
  await db.from('saved_projects').delete().eq('user_id', user.id).eq('project_id', projectId);

  return NextResponse.json({ ok: true });
}
