import { NextResponse } from 'next/server';
import { getCurrentUser, activatePremium } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  const { email, days, note } = await request.json();

  if (!email || !days || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Укажи email и количество дней (1-365)' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Найти пользователя по email
  const { data: targetProfile } = await db
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: `Пользователь ${email} не найден` }, { status: 404 });
  }

  // Активируем премиум
  await activatePremium(targetProfile.id, days);

  // Логируем подарок
  await db.from('premium_gifts').insert({
    admin_id: user.id,
    user_id: targetProfile.id,
    days,
    note: note || null,
  });

  // Получаем обновлённый профиль
  const { data: updated } = await db
    .from('profiles')
    .select('premium_until')
    .eq('id', targetProfile.id)
    .single();

  return NextResponse.json({
    success: true,
    message: `✅ Подарено ${days} дней премиума для ${email}`,
    premium_until: updated?.premium_until,
  });
}
