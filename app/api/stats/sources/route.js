import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 минут

const SOURCES = [
  'fl', 'kwork', 'freelanceru', 'youdo',
  'freelancer', 'peopleperhour', 'guru', 'upwork',
];

export async function GET() {
  const db = supabaseAdmin();

  const stats = {};
  await Promise.all(
    SOURCES.map(async (source) => {
      const { count } = await db
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('source', source);
      stats[source] = count || 0;
    })
  );

  return NextResponse.json(stats);
}
