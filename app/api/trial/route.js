import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Триал отключён: подписка только платная (149 ₽ или $5)
export async function POST() {
  return NextResponse.json({
    error: 'Триал больше не доступен. Оформи подписку на /pricing',
    success: false,
  }, { status: 410 });
}
