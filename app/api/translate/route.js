import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Перевод через AI ОТКЛЮЧЁН: не вызываем платный API (Groq/Anthropic).
export async function POST() {
  return NextResponse.json(
    { error: 'Перевод отключён', text: '', disabled: true },
    { status: 410 }
  );
}
