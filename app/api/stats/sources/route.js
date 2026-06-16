import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCES = [
  'fl', 'kwork', 'freelanceru', 'youdo',
  'freelancer', 'peopleperhour', 'guru', 'upwork',
];

let cache = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
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
    cacheAt = Date.now();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[stats/sources] error:', err.message);
    return NextResponse.json(cache || {});
  }
}
