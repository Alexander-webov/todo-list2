import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';

// POST /api/telegram/subscribe — привязать Telegram к аккаунту
export async function POST(request) {
  const body = await request.json();
  const { telegram_chat_id, filter_sources, filter_keywords, filter_categories } = body;

  if (!telegram_chat_id) {
    return NextResponse.json({ error: 'telegram_chat_id required' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { error } = await db.from('users').upsert({
    telegram_chat_id: String(telegram_chat_id),
    filter_sources: filter_sources || [],
    filter_keywords: filter_keywords || [],
    filter_categories: filter_categories || [],
  }, { onConflict: 'telegram_chat_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendTelegramMessage(
    telegram_chat_id,
    '✅ <b>Подписка активирована!</b>\n\nКак только появится новый проект — я пришлю уведомление.'
  );

  return NextResponse.json({ success: true });
}

// POST /api/telegram/webhook — обработчик входящих сообщений от Telegram
export async function webhook(request) {
  const body = await request.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat?.id;
  const text = message.text || '';

  if (text === '/start') {
    await sendTelegramMessage(
      chatId,
      '👋 <b>Привет!</b>\n\n' +
      'Я бот allFreelancersHere — агрегатора фриланс-проектов.\n\n' +
      '🔔 Перейди на сайт и подключи уведомления в настройках профиля.\n\n' +
      'Твой Chat ID: <code>' + chatId + '</code>'
    );
  }

  return NextResponse.json({ ok: true });
}
