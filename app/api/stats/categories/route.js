import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // не запекать на билде

let cache = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
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
    cacheTime = Date.now();
    return NextResponse.json(counts);
  } catch (e) {
    return NextResponse.json(cache || {});
  }
}
