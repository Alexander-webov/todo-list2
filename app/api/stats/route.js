import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
// force-dynamic: НЕ запекать на билде (иначе сборка виснет на запросе к БД).
export const dynamic = 'force-dynamic';

// Кэш в памяти, чтобы не дёргать БД на каждый запрос.
let cache = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
    return NextResponse.json(cache);
  }

  try {
    const db = supabaseAdmin();
    const [
      { count: totalProjects },
      { count: totalUsers },
      { count: premiumUsers },
      { count: projectsToday },
    ] = await Promise.all([
      db.from('projects').select('*', { count: 'planned', head: true }),
      db.from('profiles').select('*', { count: 'planned', head: true }),
      db.from('profiles').select('*', { count: 'planned', head: true }).eq('is_premium', true),
      db.from('projects').select('*', { count: 'planned', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    cache = {
      totalProjects: totalProjects || 0,
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      projectsToday: projectsToday || 0,
    };
    cacheTime = Date.now();
    return NextResponse.json(cache);
  } catch (e) {
    // База недоступна — отдаём последний кэш или нули, не падаем.
    return NextResponse.json(cache || { totalProjects: 0, totalUsers: 0, premiumUsers: 0, projectsToday: 0 });
  }
}
