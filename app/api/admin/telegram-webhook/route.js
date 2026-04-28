import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан в .env.local' }, { status: 400 });
  }

  const { webhookUrl } = await request.json();
  if (!webhookUrl) {
    return NextResponse.json({ error: 'webhookUrl обязателен' }, { status: 400 });
  }

  const fullUrl = `${webhookUrl}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: fullUrl }),
  });

  const data = await res.json();
  return NextResponse.json({ ...data, registeredUrl: fullUrl });
}

export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN не задан' }, { status: 400 });
  }

  // Получаем текущий статус webhook
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const data = await res.json();
  return NextResponse.json(data);
}
