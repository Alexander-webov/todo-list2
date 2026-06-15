import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const revalidate = 300; // кэш 5 минут

export async function GET() {
  const db = supabaseAdmin();

  const [
    { count: totalProjects },
    { count: totalUsers },
    { count: premiumUsers },
    { count: projectsToday },
  ] = await Promise.all([
    db.from('projects').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    db.from('projects').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return NextResponse.json({
    totalProjects: totalProjects || 0,
    totalUsers: totalUsers || 0,
    premiumUsers: premiumUsers || 0,
    projectsToday: projectsToday || 0,
  });
}
