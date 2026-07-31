import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// AI-советчик внутри конструктора резюме — часть платной фичи резюме,
// отдельного списания не требует (доступен всем, у кого есть слот резюме).
// Использует тот же OpenAI, что и /api/generate-response — независимая
// фича с собственным лёгким рейт-лимитом.

const AI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

const lastCallByUser = new Map();
const RATE_LIMIT_MS = 8000;

const SECTION_PROMPTS = {
  summary: (ctx) => `Ты помогаешь улучшить раздел "О себе" в резюме для позиции "${ctx.targetRole || 'не указана'}" (${ctx.country === 'intl' ? 'резюме для США/Европы — по нормам этих стран: без фото, возраста, семейного положения, кратко и по делу, упор на достижения с цифрами' : 'резюме для России — разрешены более развёрнутые формулировки'}).

Текущий текст: "${ctx.text || '(пусто)'}"

Перепиши в 2-4 предложения: конкретно, с фокусом на ценность для работодателя, без клише вроде "коммуникабельный, стрессоустойчивый". Выведи только готовый текст, без пояснений.`,

  experience: (ctx) => `Ты улучшаешь описание опыта работы в резюме для позиции "${ctx.targetRole || 'не указана'}" (${ctx.country === 'intl' ? 'формат США/Европы — глаголы действия в начале строки (Led, Built, Increased), результаты с цифрами' : 'формат России'}).

Должность: "${ctx.position || ''}"
Текущее описание: "${ctx.text || '(пусто)'}"

Перепиши в 2-4 пункта: конкретные достижения и результаты вместо простого перечисления обязанностей, с цифрами где возможно. Выведи только готовый текст (пункты через перенос строки), без пояснений.`,
};

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });

  const now = Date.now();
  const last = lastCallByUser.get(user.id) || 0;
  if (now - last < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: 'Подожди пару секунд между запросами', code: 'AI_RATE_LIMIT' },
      { status: 429 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI-советчик временно недоступен' }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { section, ...ctx } = body || {};
  const buildPrompt = SECTION_PROMPTS[section];
  if (!buildPrompt) return NextResponse.json({ error: 'Неизвестный раздел' }, { status: 400 });

  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: buildPrompt(ctx) }],
        temperature: 0.6,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI-советчик временно недоступен' }, { status: 503 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || '';

    lastCallByUser.set(user.id, now);
    if (lastCallByUser.size > 5000) lastCallByUser.clear();

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[Resume AI advice] Ошибка:', err.message);
    return NextResponse.json({ error: 'AI-советчик временно недоступен' }, { status: 503 });
  }
}
