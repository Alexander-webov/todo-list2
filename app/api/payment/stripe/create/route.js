import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[Stripe] STRIPE_SECRET_KEY не задан в env');
    return NextResponse.json({
      error: 'Платёжная система не настроена. Сообщите администратору.',
    }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 500, // $5.00 в центах
          product_data: {
            name: 'allFreelancersHere Premium',
            description: 'Доступ ко всем проектам на 30 дней',
          },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/dashboard?payment=success`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { user_id: user.id },
      customer_email: user.email,
    });

    // Сохраняем сессию в БД (best effort)
    try {
      const db = supabaseAdmin();
      await db.from('payments').insert({
        user_id: user.id,
        provider: 'stripe',
        provider_id: session.id,
        amount: 5,
        currency: 'USD',
        status: 'pending',
        days_granted: 30,
      });
    } catch (dbErr) {
      console.error('[Stripe] Не удалось сохранить в БД:', dbErr.message);
    }

    return NextResponse.json({
      url: session.url,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    console.error('[Stripe] Ошибка:', err);
    return NextResponse.json({
      error: err.message || 'Ошибка при создании платежа',
    }, { status: 500 });
  }
}
