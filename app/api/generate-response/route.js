import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Ты опытный фрилансер который пишет отклики на заказы. 
Пиши кратко, по делу, без воды. Не начинай с "Здравствуйте" или "Добрый день".
Сразу переходи к сути — почему ты подходишь для этого заказа.
Максимум 150 слов. Пиши на русском.`;

async function generateWithGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function generateWithAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text;
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  // Проверка премиума: AI-отклики — премиум-фича
  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );
  if (!isPremium) {
    return NextResponse.json({
      error: 'AI-отклики доступны только в премиум-подписке',
      premium_required: true,
    }, { status: 402 });
  }

  const { title, description, budget, source } = await request.json();

  const prompt = `Напиши отклик на фриланс-заказ:
Заголовок: ${title}
Описание: ${description?.slice(0, 500) || 'не указано'}
Бюджет: ${budget || 'не указан'}
Биржа: ${source}`;

  try {
    let text = null;

    // Сначала пробуем Groq (бесплатный)
    if (process.env.GROQ_API_KEY) {
      text = await generateWithGroq(prompt);
    }

    // Fallback на Anthropic если Groq недоступен
    if (!text && process.env.ANTHROPIC_API_KEY) {
      text = await generateWithAnthropic(prompt);
    }

    if (!text) {
      return NextResponse.json({ error: 'AI сервис недоступен' }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[AI] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
