import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ ok: false });

  const db = supabaseAdmin();
  await db.rpc('increment_ad_clicks', { ad_id: id }).catch(() => {
    // fallback: manual increment
    db.from('ads').select('clicks').eq('id', id).single().then(({ data }) => {
      if (data) db.from('ads').update({ clicks: (data.clicks || 0) + 1 }).eq('id', id);
    });
  });

  return NextResponse.json({ ok: true });
}
