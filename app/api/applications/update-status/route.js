import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['sent', 'responded', 'accepted', 'rejected', 'closed_lost'];

// PATCH /api/applications/update-status
// body: { project_id, status, deal_amount?, notes? }
// Работает с user_id + project_id, не с id, чтобы клиенту не нужно было хранить application_id
export async function PATCH(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { project_id, status, deal_amount, notes } = body;
  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  }
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Проверяем что отклик существует. Если нет — создаём (на случай прямого перехода без track)
  const { data: existing } = await db
    .from('applications')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('project_id', project_id)
    .maybeSingle();

  const patch = {
    status: status || 'sent',
    status_updated_at: new Date().toISOString(),
  };
  if (deal_amount !== undefined) patch.deal_amount = deal_amount;
  if (notes !== undefined) patch.notes = notes;

  if (existing) {
    const { error } = await db
      .from('applications')
      .update(patch)
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Подтягиваем мета проекта для снапшота
    const { data: project } = await db
      .from('projects')
      .select('source, budget_min')
      .eq('id', project_id)
      .single();

    const { error } = await db.from('applications').insert({
      user_id: user.id,
      project_id,
      source: project?.source || null,
      project_budget: project?.budget_min || null,
      ...patch,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // XP-бонус за отметку «получил ответ» — микро-геймификация
  if (status === 'responded' || status === 'accepted') {
    try {
      const { data: profile } = await db.from('profiles').select('xp').eq('id', user.id).single();
      const bonus = status === 'accepted' ? 50 : 20;
      await db.from('profiles').update({ xp: (profile?.xp || 0) + bonus }).eq('id', user.id);
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
