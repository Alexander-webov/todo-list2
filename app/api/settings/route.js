import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return NextResponse.json(cache);
  }
  let yandex_ads_enabled = true; // дефолт — включено (если таблицы/строки нет)
  let google_ads_enabled = true;
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from('app_settings')
      .select('key, value')
      .in('key', ['yandex_ads_enabled', 'google_ads_enabled']);
    for (const row of data || []) {
      if (row.key === 'yandex_ads_enabled' && row.value === 'false') yandex_ads_enabled = false;
      if (row.key === 'google_ads_enabled' && row.value === 'false') google_ads_enabled = false;
    }
  } catch (e) {
    // таблицы может ещё не быть — оставляем дефолт true
  }
  cache = { yandex_ads_enabled, google_ads_enabled };
  cacheAt = Date.now();
  return NextResponse.json(cache);
}
