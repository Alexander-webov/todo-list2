import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// AI-отклики ОТКЛЮЧЕНЫ: фича выключена, чтобы не платить за AI API (Groq/Anthropic).
// Роут ничего не вызывает и не тратит деньги. Чтобы вернуть — восстанови старую версию из git.
export async function POST() {
  return NextResponse.json(
    { error: 'AI-отклики временно отключены', text: '', disabled: true },
    { status: 410 }
  );
}
