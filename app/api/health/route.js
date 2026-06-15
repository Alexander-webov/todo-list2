import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Лёгкий healthcheck для Railway: отвечает мгновенно, без БД и парсеров.
// Чтобы Railway не перезапускал сервис, когда главная тормозит под нагрузкой.
export async function GET() {
  return NextResponse.json({ ok: true });
}
