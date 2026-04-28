import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { activatePremium } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();

    // YooKassa присылает объект с event и object
    const { event, object: payment } = body;

    if (event !== 'payment.succeeded') {
      return NextResponse.json({ ok: true });
    }

    const userId = payment.metadata?.user_id;
    if (!userId) {
      console.error('[YooKassa webhook] Нет user_id в metadata');
      return NextResponse.json({ ok: true });
    }

    const db = supabaseAdmin();

    // Проверяем что не обработали раньше
    const { data: existing } = await db
      .from('payments')
      .select('id, status')
      .eq('provider_id', payment.id)
      .single();

    if (existing?.status === 'succeeded') {
      return NextResponse.json({ ok: true }); // идемпотентность
    }

    // Обновляем статус платежа
    await db
      .from('payments')
      .update({ status: 'succeeded', confirmed_at: new Date().toISOString() })
      .eq('provider_id', payment.id);

    // Активируем премиум на 30 дней
    await activatePremium(userId, 30);

    console.log(`[YooKassa] Премиум активирован для ${userId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[YooKassa webhook] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
