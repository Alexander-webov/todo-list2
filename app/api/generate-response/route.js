import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// AI-генерация откликов на Groq (OpenAI-совместимый API, бесплатный тир
// с щедрым лимитом — этого достаточно для короткого текста отклика,
// не нужна дорогая топовая модель ради пары абзацев).
// Раньше фича была отключена целиком (всегда 410), потому что "не хотели
// платить за AI API" — но сама фича продаётся как часть премиума на
// /pricing и в PremiumGate, то есть платящие люди покупали то, чего
// физически не было. Включаем обратно с бесплатным провайдером и
// собственным рейт-лимитом, чтобы не улететь в деньги при всплеске.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// Простой rate limit в памяти процесса: не больше 1 генерации в 15 секунд
// на пользователя. Не переживает рестарт процесса — этого достаточно,
// цель просто не дать накрутить сотни запросов подряд.
const lastCallByUser = new Map();
const RATE_LIMIT_MS = 15000;

function buildPrompt({ title, description, source, budget }) {
  return `Ты помогаешь фрилансеру написать короткий, живой отклик на проект — без канцелярита и шаблонных фраз вроде "Здравствуйте! Готов выполнить вашу задачу качественно и в срок".

Проект: "${title}"
Источник: ${source || 'не указан'}
Бюджет: ${budget || 'не указан'}
Описание: ${(description || '').slice(0, 1000)}

Напиши отклик на русском языке, 3-5 предложений:
- Обратись к сути задачи, покажи что реально прочитал описание
- Коротко упомяни, как бы подошёл к решению (без воды)
- Задай один уточняющий вопрос по задаче, если это уместно
- Без приветствия "Здравствуйте" и подписи в конце — только тело отклика
- Без markdown, только обычный текст`;
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт', premium_required: false }, { status: 401 });
  }

  if (!profile?.is_premium) {
    return NextResponse.json(
      { error: 'AI-отклики доступны с премиумом', premium_required: true },
      { status: 402 }
    );
  }

  const now = Date.now();
  const last = lastCallByUser.get(user.id) || 0;
  if (now - last < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `Подожди ${retryAfter} сек. между генерациями`, code: 'AI_RATE_LIMIT', retryAfter },
      { status: 429 }
    );
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('[AI Response] GROQ_API_KEY не настроен');
    return NextResponse.json(
      { error: 'AI сервис временно недоступен. Можно откликнуться на проект вручную.' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const { title, description, source, budget } = body || {};
  if (!title) {
    return NextResponse.json({ error: 'Не хватает данных о проекте' }, { status: 400 });
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: buildPrompt({ title, description, source, budget }) }],
        temperature: 0.7,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI Response] Groq вернул ${res.status}:`, errText.slice(0, 300));
      return NextResponse.json(
        { error: 'AI сервис временно недоступен. Можно откликнуться на проект вручную.' },
        { status: 503 }
      );
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || '';

    lastCallByUser.set(user.id, now);
    // Не даём Map расти бесконечно у активных сайтов — грубая, но простая защита.
    if (lastCallByUser.size > 5000) lastCallByUser.clear();

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[AI Response] Ошибка:', err.message);
    return NextResponse.json(
      { error: 'AI сервис временно недоступен. Можно откликнуться на проект вручную.' },
      { status: 503 }
    );
  }
}
