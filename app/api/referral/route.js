import { NextResponse } from 'next/server';
import { getCurrentUser, activatePremium } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Применить реферальный код при регистрации
export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  const { code } = await request.json();
  if (!code) return NextResponse.json({ error: 'Код обязателен' }, { status: 400 });

  if (profile?.referred_by) {
    return NextResponse.json({ error: 'Реферальный код уже применён' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Ищем владельца кода
  const { data: referrer } = await db
    .from('profiles')
    .select('id, email')
    .eq('referral_code', code.toLowerCase())
    .single();

  if (!referrer) return NextResponse.json({ error: 'Код не найден' }, { status: 404 });
  if (referrer.id === user.id) return NextResponse.json({ error: 'Нельзя использовать свой код' }, { status: 400 });

  // Даём 7 дней тому кто пригласил
  await activatePremium(referrer.id, 7);

  // Даём 3 дня новому пользователю
  await activatePremium(user.id, 7);

  // Записываем связь
  await db.from('profiles').update({ referred_by: referrer.id }).eq('id', user.id);

  return NextResponse.json({
    success: true,
    message: 'Реферальный код применён! Вам начислено 3 дня Премиума.'
  });
}

// Получить свой реферальный код и статистику
export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  const db = supabaseAdmin();

  // Считаем сколько людей зарегистрировалось по нашему коду
  const { count } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  return NextResponse.json({
    code: profile?.referral_code,
    referralLink: `${process.env.NEXT_PUBLIC_SITE_URL}/register?ref=${profile?.referral_code}`,
    totalReferred: count || 0,
    daysEarned: (count || 0) * 7,
  });
}
