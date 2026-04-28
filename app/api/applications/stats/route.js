import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// Сколько откликов нужно для получения проекта (2026 год, реалистичные цифры)
const APPS_PER_PROJECT = 15;
// Сколько считается "хорошим" откликом по score
const GOOD_SCORE_THRESHOLD = 20;

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      isGuest: true,
      total: 0, today: 0, week: 0,
      goodThisWeek: 0,
      target: APPS_PER_PROJECT,
    });
  }

  const db = supabaseAdmin();

  // Одним запросом — последние 7 дней откликов
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const { data: weekApps } = await db
    .from('applications')
    .select('created_at, project_score, used_ai')
    .eq('user_id', user.id)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false });

  const apps = weekApps || [];
  const week = apps.length;
  const today = apps.filter(a => new Date(a.created_at) >= todayStart).length;
  const goodThisWeek = apps.filter(a => (Number(a.project_score) || 0) >= GOOD_SCORE_THRESHOLD).length;

  // Общее количество (отдельным запросом — count only)
  const { count: total } = await db
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Streak + XP из профиля
  const { data: profile } = await db
    .from('profiles')
    .select('visit_streak, total_visits, xp, user_role')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    isGuest: false,
    total: total || 0,
    today,
    week,
    goodThisWeek,
    target: APPS_PER_PROJECT,
    goodThreshold: GOOD_SCORE_THRESHOLD,
    streak: profile?.visit_streak || 0,
    totalVisits: profile?.total_visits || 0,
    xp: profile?.xp || 0,
    userRole: profile?.user_role || null,
  });
}
