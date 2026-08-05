import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

async function readFlags() {
  let yandex_ads_enabled = true;
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
  } catch (e) {}
  return { yandex_ads_enabled, google_ads_enabled };
}

export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await readFlags());
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  try {
    const db = supabaseAdmin();
    const updates = [];
    if (typeof body.yandex_ads_enabled === 'boolean') {
      updates.push({ key: 'yandex_ads_enabled', value: body.yandex_ads_enabled ? 'true' : 'false' });
    }
    if (typeof body.google_ads_enabled === 'boolean') {
      updates.push({ key: 'google_ads_enabled', value: body.google_ads_enabled ? 'true' : 'false' });
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'Нечего сохранять' }, { status: 400 });
    }
    const { error } = await db.from('app_settings').upsert(updates, { onConflict: 'key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, ...(await readFlags()) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
