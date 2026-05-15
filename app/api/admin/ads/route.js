import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// GET — список всех объявлений (для админки) или активных (для фронта)
export async function GET(request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[api/admin/ads] Missing Supabase env');
      return NextResponse.json(
        { error: 'Server not configured', ads: [] },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position'); // feed | sidebar | telegram | all
    const activeOnly = searchParams.get('active') === '1';

    const db = supabaseAdmin();
    let query = db.from('ads').select('*').order('priority', { ascending: false });

    if (activeOnly) query = query.eq('is_active', true);
    if (position) query = query.or(`position.eq.${position},position.eq.all`);

    const { data, error } = await query;
    if (error) {
      console.error('[api/admin/ads] Supabase error:', error);
      // If the table simply doesn't exist yet (migrations not applied),
      // return an empty list with 200 so the frontend renders normally.
      const tableMissing = /relation .*ads.* does not exist/i.test(error.message ?? '');
      return NextResponse.json(
        { error: error.message, ads: [] },
        { status: tableMissing ? 200 : 500 }
      );
    }

    return NextResponse.json({ ads: data || [] });
  } catch (e) {
    console.error('[api/admin/ads] uncaught:', e);
    return NextResponse.json(
      { error: e?.message || 'Internal server error', ads: [] },
      { status: 500 }
    );
  }
}

// POST — создать новое объявление
export async function POST(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const db = supabaseAdmin();

  const { data, error } = await db.from('ads').insert({
    title: body.title,
    description: body.description || '',
    image_url: body.image_url || '',
    link: body.link,
    position: body.position || 'feed',
    is_active: body.is_active ?? true,
    priority: body.priority || 0,
    tg_pin_hours: body.tg_pin_hours ?? 2,
    tg_keep_hours: body.tg_keep_hours ?? 48,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}

// PUT — обновить объявление
export async function PUT(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db.from('ads').update({
    title: body.title,
    description: body.description,
    image_url: body.image_url,
    link: body.link,
    position: body.position,
    is_active: body.is_active,
    priority: body.priority,
    tg_pin_hours: body.tg_pin_hours,
    tg_keep_hours: body.tg_keep_hours,
  }).eq('id', body.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}

// DELETE — удалить объявление
export async function DELETE(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from('ads').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
