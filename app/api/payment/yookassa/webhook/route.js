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

    if (payment.metadata?.type === 'ai_credits') {
      // Разовая покупка кредитов на AI-отклики, не подписка
      const credits = parseInt(payment.metadata?.credits, 10) || 0;
      const { data: profile } = await db.from('profiles').select('ai_credits').eq('id', userId).single();
      await db
        .from('profiles')
        .update({ ai_credits: (profile?.ai_credits || 0) + credits })
        .eq('id', userId);
      console.log(`[YooKassa] Начислено ${credits} AI-кредитов для ${userId}`);
    } else if (payment.metadata?.type === 'resume_credits') {
      // Разовая покупка доп. слотов резюме
      const slots = parseInt(payment.metadata?.slots, 10) || 0;
      const { data: profile } = await db.from('profiles').select('resume_credits').eq('id', userId).single();
      await db
        .from('profiles')
        .update({ resume_credits: (profile?.resume_credits || 0) + slots })
        .eq('id', userId);
      console.log(`[YooKassa] Начислено ${slots} слотов резюме для ${userId}`);
    } else {
      // Активируем премиум на 30 дней
      await activatePremium(userId, 30);

      // Если часть суммы была покрыта балансом сайта — списываем здесь,
      // только после подтверждённого успеха оплаты, не раньше.
      const walletUsed = parseFloat(payment.metadata?.wallet_used) || 0;
      if (walletUsed > 0) {
        const { data: profile } = await db.from('profiles').select('wallet_balance').eq('id', userId).single();
        await db
          .from('profiles')
          .update({ wallet_balance: Math.max((profile?.wallet_balance || 0) - walletUsed, 0) })
          .eq('id', userId);
        await db.from('wallet_transactions').insert({
          user_id: userId,
          amount: -walletUsed,
          type: 'spent_premium',
          description: 'Частичная оплата премиума балансом',
        });
      }

      console.log(`[YooKassa] Премиум активирован для ${userId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[YooKassa webhook] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
