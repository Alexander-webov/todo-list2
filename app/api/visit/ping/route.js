import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/visit/ping — вызывается клиентом при заходе на сайт
// Обновляет visit_streak, total_visits, xp, last_visit_at
// Возвращает: новый streak, что-то типа isNewDay — чтобы фронт показал баннер
export async function POST() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, isGuest: true });
  }

  const db = supabaseAdmin();

  const { data, error } = await db.rpc('ping_user_visit', { p_user_id: user.id });

  if (error) {
    console.error('[Visit] Ошибка:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  // Сколько НОВЫХ проектов появилось с прошлого визита — красивый сигнал для возвращающихся
  let newProjectsSinceLastVisit = 0;
  if (row?.is_new_day) {
    // Считаем от 24 часов назад (приблизительно "с прошлого визита")
    const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { count } = await db
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayAgo);
    newProjectsSinceLastVisit = count || 0;
  }

  return NextResponse.json({
    ok: true,
    streak: row?.streak || 0,
    totalVisits: row?.total_visits || 0,
    xp: row?.xp || 0,
    isNewDay: row?.is_new_day || false,
    newProjectsSinceLastVisit,
  });
}
