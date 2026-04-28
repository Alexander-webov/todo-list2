import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { activatePremium } from '@/lib/auth';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe webhook] Неверная подпись:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;

    if (!userId) {
      console.error('[Stripe webhook] Нет user_id в metadata');
      return NextResponse.json({ ok: true });
    }

    const db = supabaseAdmin();

    // Проверяем идемпотентность
    const { data: existing } = await db
      .from('payments')
      .select('status')
      .eq('provider_id', session.id)
      .single();

    if (existing?.status === 'succeeded') {
      return NextResponse.json({ ok: true });
    }

    await db
      .from('payments')
      .update({ status: 'succeeded', confirmed_at: new Date().toISOString() })
      .eq('provider_id', session.id);

    await activatePremium(userId, 30);
    console.log(`[Stripe] Премиум активирован для ${userId}`);
  }

  return NextResponse.json({ ok: true });
}
