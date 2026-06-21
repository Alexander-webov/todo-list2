import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

async function readFlag() {
  let yandex_ads_enabled = true;
  try {
    const db = supabaseAdmin();
    const { data } = await db.from('app_settings').select('value').eq('key', 'yandex_ads_enabled').single();
    if (data && data.value === 'false') yandex_ads_enabled = false;
  } catch (e) {}
  return yandex_ads_enabled;
}

export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ yandex_ads_enabled: await readFlag() });
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { yandex_ads_enabled } = await request.json();
  try {
    const db = supabaseAdmin();
    const { error } = await db.from('app_settings').upsert(
      { key: 'yandex_ads_enabled', value: yandex_ads_enabled ? 'true' : 'false' },
      { onConflict: 'key' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, yandex_ads_enabled: !!yandex_ads_enabled });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
