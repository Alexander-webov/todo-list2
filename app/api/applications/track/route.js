import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/applications/track
// body: { project_id, used_ai?: boolean }
export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    // Для анонимов — просто ok, ничего не пишем
    return NextResponse.json({ ok: true, tracked: false });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const projectId = body.project_id;
  if (!projectId) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Подтягиваем данные проекта для снапшота
  const { data: project } = await db
    .from('projects')
    .select('source, budget_min, category')
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'project not found' }, { status: 404 });
  }

  // Простой score проекта: чем больше бюджет — тем выше. Используем тот же подход
  // что и в lib/telegram.js (упрощённо — чтобы не тащить весь scoreProject)
  const budget = Number(project.budget_min) || 0;
  let score = 0;
  if (budget >= 50000) score = 50;
  else if (budget >= 20000) score = 40;
  else if (budget >= 10000) score = 30;
  else if (budget >= 5000) score = 20;
  else if (budget > 0) score = 10;

  const { error } = await db.from('applications').insert({
    user_id: user.id,
    project_id: projectId,
    source: project.source,
    project_budget: budget || null,
    project_score: score,
    used_ai: !!body.used_ai,
  });

  // Дубль (unique constraint) — это норм, пользователь просто кликнул второй раз
  if (error && !error.message?.includes('duplicate')) {
    console.error('[Applications] Ошибка:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Начисляем XP за отклик
  try {
    await db.rpc('activate_premium', { p_user_id: user.id, p_days: 0 }).catch(() => {});
    // простое начисление XP через обычный апдейт
    const { data: profile } = await db.from('profiles').select('xp').eq('id', user.id).single();
    const xpGain = 10 + (score >= 30 ? 5 : 0); // бонус за жирный заказ
    await db.from('profiles').update({ xp: (profile?.xp || 0) + xpGain }).eq('id', user.id);
  } catch (_) {}

  return NextResponse.json({ ok: true, tracked: true, score });
}
