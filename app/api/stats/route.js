import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // не пререндерить в билде (билд не лезет в БД)

let cache = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
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
    cacheAt = Date.now();
    return NextResponse.json(cache);
  } catch (err) {
    console.error('[stats] error:', err.message);
    return NextResponse.json(cache || { totalProjects: 0, totalUsers: 0, premiumUsers: 0, projectsToday: 0 });
  }
}
