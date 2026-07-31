import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET — список резюме текущего пользователя
export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('resumes')
    .select('id, country, data, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message, resumes: [] }, { status: 500 });
  return NextResponse.json({ resumes: data || [] });
}

// POST — создать новое резюме. Первое — бесплатно, дальше нужны resume_credits
// (пакет 10 за 499₽, см. /api/payment/yookassa/create-resume-credits).
export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const db = supabaseAdmin();

  const { count } = await db
    .from('resumes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const limit = 1 + (profile?.resume_credits || 0);
  if ((count || 0) >= limit) {
    return NextResponse.json(
      { error: 'Бесплатное резюме уже использовано. Купи дополнительные слоты.', credits_required: true },
      { status: 402 }
    );
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { data, error } = await db
    .from('resumes')
    .insert({
      user_id: user.id,
      country: body.country === 'intl' ? 'intl' : 'ru',
      data: body.data || {},
    })
    .select('id, country, data, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resume: data });
}
