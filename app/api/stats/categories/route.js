import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return NextResponse.json(cache);
  }
  try {
    const db = supabaseAdmin();
    const counts = {};
    await Promise.all(
      CATEGORIES.map(async (cat) => {
        const { count } = await db
          .from('projects')
          .select('*', { count: 'planned', head: true })
          .eq('category', cat);
        counts[cat] = count || 0;
      })
    );
    cache = counts;
    cacheAt = Date.now();
    return NextResponse.json(counts);
  } catch (err) {
    console.error('[stats/categories] error:', err.message);
    return NextResponse.json(cache || {});
  }
}
