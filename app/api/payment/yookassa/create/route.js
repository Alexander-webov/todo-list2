import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getPrice, yookassaAmountString } from '@/lib/pricing';
import { activatePremium } from '@/lib/auth';

export const runtime = 'nodejs';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const CURRENCY = 'RUB';

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const wantsWallet = !!body.use_wallet;

  const basePrice = parseFloat(yookassaAmountString()); // цена со скидкой из lib/pricing.js
  const walletBalance = Number(profile?.wallet_balance || 0);
  const walletUsed = wantsWallet ? Math.min(walletBalance, basePrice) : 0;
  const finalPrice = Math.max(basePrice - walletUsed, 0);

  const db = supabaseAdmin();

  // Баланса хватило на всю сумму — активируем сразу, без похода в YooKassa
  if (walletUsed > 0 && finalPrice === 0) {
    await db.from('profiles').update({ wallet_balance: walletBalance - walletUsed }).eq('id', user.id);
    await db.from('wallet_transactions').insert({
      user_id: user.id,
      amount: -walletUsed,
      type: 'spent_premium',
      description: 'Премиум-подписка полностью оплачена балансом',
    });
    await activatePremium(user.id, 30);
    return NextResponse.json({ activated_free: true });
  }

  // Проверяем что ключи подключены — иначе ловим непонятную 401 от ЮКассы
  if (!SHOP_ID || !SECRET_KEY) {
    console.error('[YooKassa] Не заданы YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY в env');
    return NextResponse.json({
      error: 'Платёжная система не настроена. Сообщите администратору.',
    }, { status: 500 });
  }

  const idempotenceKey = uuidv4();
  const AMOUNT = finalPrice.toFixed(2);

  try {
    const credentials = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify({
        amount: { value: AMOUNT, currency: CURRENCY },
        confirmation: {
          type: 'redirect',
          return_url: `${siteUrl}/dashboard?payment=success`,
        },
        capture: true,
        description: 'allFreelancersHere — Премиум подписка 30 дней',
        // wallet_used передаём через metadata — вебхук спишет баланс
        // только после реального успеха оплаты, не раньше.
        metadata: { user_id: user.id, wallet_used: walletUsed || undefined },
      }),
    });

    const payment = await response.json();

    if (!payment.id) {
      console.error('[YooKassa] Ошибка от API:', JSON.stringify(payment));
      const userMessage = payment.description || payment.error_description
        || 'Ошибка при создании платежа. Попробуйте позже.';
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      console.error('[YooKassa] Нет confirmation_url в ответе:', JSON.stringify(payment));
      return NextResponse.json({
        error: 'Платёжная система не вернула ссылку для оплаты',
      }, { status: 500 });
    }

    // Сохраняем платёж в БД (best effort, не критично если упадёт)
    try {
      await db.from('payments').insert({
        user_id: user.id,
        provider: 'yookassa',
        provider_id: payment.id,
        amount: parseFloat(AMOUNT),
        currency: CURRENCY,
        status: 'pending',
        days_granted: 30,
      });
    } catch (dbErr) {
      console.error('[YooKassa] Не удалось сохранить в БД:', dbErr.message);
    }

    return NextResponse.json({
      confirmation_url: confirmationUrl,
      url: confirmationUrl,
      payment_id: payment.id,
    });
  } catch (err) {
    console.error('[YooKassa] Критическая ошибка:', err);
    return NextResponse.json({
      error: err.message || 'Ошибка при создании платежа',
    }, { status: 500 });
  }
}
