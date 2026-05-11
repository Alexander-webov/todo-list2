import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const AMOUNT = '999.00';
const CURRENCY = 'RUB';

export async function POST() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  // Проверяем что ключи подключены — иначе ловим непонятную 401 от ЮКассы
  if (!SHOP_ID || !SECRET_KEY) {
    console.error('[YooKassa] Не заданы YOOKASSA_SHOP_ID или YOOKASSA_SECRET_KEY в env');
    return NextResponse.json({
      error: 'Платёжная система не настроена. Сообщите администратору.',
    }, { status: 500 });
  }

  const idempotenceKey = uuidv4();

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
        metadata: { user_id: user.id },
      }),
    });

    const payment = await response.json();

    if (!payment.id) {
      console.error('[YooKassa] Ошибка от API:', JSON.stringify(payment));
      // Возвращаем понятную ошибку юзеру
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
      const db = supabaseAdmin();
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

    // Возвращаем оба ключа — на фронте по-разному могут читать
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
