import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('resumes')
    .select('id, country, data, created_at, updated_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Резюме не найдено' }, { status: 404 });
  return NextResponse.json({ resume: data });
}

export async function PUT(request, { params }) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('resumes')
    .update({
      country: body.country === 'intl' ? 'intl' : 'ru',
      data: body.data || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, country, data, created_at, updated_at')
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || 'Не удалось сохранить' }, { status: 500 });
  return NextResponse.json({ resume: data });
}

export async function DELETE(request, { params }) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db.from('resumes').delete().eq('id', params.id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
