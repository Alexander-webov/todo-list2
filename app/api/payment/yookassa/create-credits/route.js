import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// Фиксированные пакеты кредитов на AI-отклики — отдельная разовая
// покупка, не подписка. Премиум по-прежнему даёт безлимит бесплатно,
// это для тех, кто не хочет подписку целиком.
const PACKS = {
  '10': { credits: 10, amount: '99.00' },
  '100': { credits: 100, amount: '499.00' },
};

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  if (!SHOP_ID || !SECRET_KEY) {
    console.error('[YooKassa credits] Не заданы YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY');
    return NextResponse.json({ error: 'Платёжная система не настроена.' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const pack = PACKS[body.pack];
  if (!pack) {
    return NextResponse.json({ error: 'Неизвестный пакет кредитов' }, { status: 400 });
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
        amount: { value: pack.amount, currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: `${siteUrl}/ai-response?payment=success`,
        },
        capture: true,
        description: `allFreelancersHere — ${pack.credits} кредитов на AI-отклики`,
        metadata: { user_id: user.id, type: 'ai_credits', credits: pack.credits },
      }),
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error('[YooKassa credits] Ошибка создания платежа:', payment);
      return NextResponse.json({ error: payment.description || 'Ошибка создания платежа' }, { status: 500 });
    }

    const confirmationUrl = payment.confirmation?.confirmation_url;

    try {
      const db = supabaseAdmin();
      await db.from('payments').insert({
        user_id: user.id,
        provider: 'yookassa',
        provider_id: payment.id,
        amount: parseFloat(pack.amount),
        currency: 'RUB',
        status: 'pending',
        days_granted: 0,
        credits_granted: pack.credits,
      });
    } catch (dbErr) {
      console.error('[YooKassa credits] Не удалось сохранить в БД:', dbErr.message);
    }

    return NextResponse.json({
      confirmation_url: confirmationUrl,
      url: confirmationUrl,
      payment_id: payment.id,
    });
  } catch (err) {
    console.error('[YooKassa credits] Критическая ошибка:', err);
    return NextResponse.json({ error: err.message || 'Ошибка при создании платежа' }, { status: 500 });
  }
}
