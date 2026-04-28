import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { chat_id } = await request.json();
  if (!chat_id) return NextResponse.json({ error: 'chat_id обязателен' }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from('profiles')
    .update({ telegram_chat_id: String(chat_id) })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendTelegramMessage(
    chat_id,
    '✅ <b>Telegram подключён к allFreelancersHere!</b>\n\n' +
    'Теперь я буду присылать тебе новые проекты сразу как они появятся на биржах.\n\n' +
    '🔔 Уведомления активированы!'
  );

  return NextResponse.json({ success: true });
}
