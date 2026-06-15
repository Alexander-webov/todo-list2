import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // не запекать на билде

const SOURCES = [
  'fl', 'kwork', 'freelanceru', 'youdo',
  'freelancer', 'peopleperhour', 'guru', 'upwork',
];

let cache = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
    return NextResponse.json(cache);
  }
  try {
    const db = supabaseAdmin();
    const stats = {};
    await Promise.all(
      SOURCES.map(async (source) => {
        const { count } = await db
          .from('projects')
          .select('*', { count: 'planned', head: true })
          .eq('source', source);
        stats[source] = count || 0;
      })
    );
    cache = stats;
    cacheTime = Date.now();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json(cache || {});
  }
}
