import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// AI-генерация откликов на OpenAI (gpt-4.1-mini — дёшево и достаточно для
// короткого текста отклика, не нужна дорогая топовая модель ради пары
// абзацев). Раньше был Groq — переключили из-за его лимитов по запросам,
// у OpenAI на аккаунте уже есть оплаченные кредиты.
// Отдельная платная фича (кредиты 99₽/10, 499₽/100), не входит в премиум —
// собственный рейт-лимит, чтобы не улететь в деньги при всплеске.

const AI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

// Простой rate limit в памяти процесса: не больше 1 генерации в 15 секунд
// на пользователя. Не переживает рестарт процесса — этого достаточно,
// цель просто не дать накрутить сотни запросов подряд.
const lastCallByUser = new Map();
const RATE_LIMIT_MS = 15000;

function buildPrompt({ title, description, source, budget }) {
  return `Ты помогаешь фрилансеру написать короткий, живой отклик на проект — без канцелярита и шаблонных фраз вроде "Здравствуйте! Готов выполнить вашу задачу качественно и в срок".

Проект: "${title || 'см. описание ниже'}"
Источник: ${source || 'не указан'}
Бюджет: ${budget || 'не указан'}
Описание: ${(description || '').slice(0, 2000)}

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

  const db = supabaseAdmin();

  // AI-отклики — отдельная платная фича, НЕ входит в обычный премиум
  // (явное решение: премиум и AI-кредиты монетизируются раздельно).
  // Всем, включая премиум-пользователей: 1 бесплатная генерация, дальше —
  // платный баланс кредитов (см. /ai-response и .../create-credits).
  let useCredit = false;
  if (profile?.ai_free_used) {
    if (!profile?.ai_credits || profile.ai_credits < 1) {
      return NextResponse.json(
        {
          error: 'Бесплатная генерация уже использована. Купи кредиты для AI-откликов.',
          credits_required: true,
        },
        { status: 402 }
      );
    }
    useCredit = true;
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

  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI Response] OPENAI_API_KEY не настроен');
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
  if (!title && !description) {
    return NextResponse.json({ error: 'Вставь описание вакансии или проекта' }, { status: 400 });
  }

  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
      console.error(`[AI Response] OpenAI вернул ${res.status}:`, errText.slice(0, 300));
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

    // Списываем только при реальном успехе — если OpenAI не ответил, попытка не в счёт.
    if (text) {
      if (useCredit) {
        await db
          .from('profiles')
          .update({ ai_credits: Math.max((profile.ai_credits || 0) - 1, 0) })
          .eq('id', user.id);
      } else {
        await db
          .from('profiles')
          .update({ ai_free_used: true })
          .eq('id', user.id);
      }
    }

    return NextResponse.json({
      text,
      creditsRemaining: useCredit ? Math.max((profile.ai_credits || 0) - 1, 0) : (profile?.ai_credits || 0),
    });
  } catch (err) {
    console.error('[AI Response] Ошибка:', err.message);
    return NextResponse.json(
      { error: 'AI сервис временно недоступен. Можно откликнуться на проект вручную.' },
      { status: 503 }
    );
  }
}
