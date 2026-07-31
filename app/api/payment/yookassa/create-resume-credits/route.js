import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// Один пакет: +10 резюме сверх бесплатного первого, за 499₽
const PACK = { slots: 10, amount: '499.00' };

export async function POST() {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });

  if (!SHOP_ID || !SECRET_KEY) {
    console.error('[YooKassa resume-credits] Не заданы YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY');
    return NextResponse.json({ error: 'Платёжная система не настроена.' }, { status: 500 });
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
        amount: { value: PACK.amount, currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: `${siteUrl}/resume-builder?payment=success`,
        },
        capture: true,
        description: `allFreelancersHere — ${PACK.slots} доп. слотов резюме`,
        metadata: { user_id: user.id, type: 'resume_credits', slots: PACK.slots },
      }),
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('[YooKassa resume-credits] Ошибка создания платежа:', payment);
      return NextResponse.json({ error: payment.description || 'Ошибка создания платежа' }, { status: 500 });
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;

    try {
      const db = supabaseAdmin();
      await db.from('payments').insert({
        user_id: user.id,
        provider: 'yookassa',
        provider_id: payment.id,
        amount: parseFloat(PACK.amount),
        currency: 'RUB',
        status: 'pending',
        days_granted: 0,
      });
    } catch (dbErr) {
      console.error('[YooKassa resume-credits] Не удалось сохранить в БД:', dbErr.message);
    }

    return NextResponse.json({ confirmation_url: confirmationUrl, url: confirmationUrl });
  } catch (err) {
    console.error('[YooKassa resume-credits] Критическая ошибка:', err);
    return NextResponse.json({ error: err.message || 'Ошибка при создании платежа' }, { status: 500 });
  }
}
