import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Лёгкий healthcheck для Railway: отвечает мгновенно, без обращения к БД и парсерам.
// Нужен, чтобы Railway не считал сервис «упавшим» и не перезапускал его,
// когда главная страница временно тормозит под нагрузкой парсера.
export async function GET() {
  return NextResponse.json({ ok: true });
}
