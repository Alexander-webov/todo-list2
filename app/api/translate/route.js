import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

  // Пробуем Groq (бесплатно)
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Ты переводчик. Переведи текст с английского на русский. Отвечай только переводом без пояснений.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    const data = await groqRes.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated) return NextResponse.json({ translated });
  } catch (_) {}

  // Fallback — Anthropic
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Переведи на русский язык, только перевод без пояснений:\n\n${text}` }],
      }),
    });
    const data = await res.json();
    const translated = data.content?.[0]?.text?.trim();
    if (translated) return NextResponse.json({ translated });
  } catch (_) {}

  return NextResponse.json({ error: 'Ошибка перевода' }, { status: 500 });
}
