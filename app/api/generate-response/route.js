import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Ты опытный фрилансер, который пишет отклики на заказы.
Пиши кратко, по делу, без воды. Не начинай с "Здравствуйте" или "Добрый день".
Сразу переходи к сути — почему ты подходишь для этого заказа.
Максимум 120 слов. Пиши на русском.`;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRetryAfter(value) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const dateMs = Date.parse(value || '');
  if (Number.isFinite(dateMs)) {
    return Math.max(1, Math.ceil((dateMs - Date.now()) / 1000));
  }

  return 20;
}

function cleanText(value, max = 1400) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithGroq(prompt) {
  if (!process.env.GROQ_API_KEY) return null;

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 240,
      temperature: 0.55,
    }),
  });

  const raw = await res.text();
  const data = safeJson(raw) || {};

  if (!res.ok) {
    const retryAfter = normalizeRetryAfter(res.headers.get('retry-after'));
    const providerMessage = data?.error?.message || data?.message || raw || `Groq error ${res.status}`;

    const error = new Error(providerMessage);
    error.provider = 'groq';
    error.status = res.status;
    error.retryAfter = retryAfter;
    throw error;
  }

  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    const error = new Error('Groq вернул пустой ответ');
    error.provider = 'groq';
    error.status = 502;
    throw error;
  }

  return text;
}

async function generateWithAnthropic(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 240,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const raw = await res.text();
  const data = safeJson(raw) || {};

  if (!res.ok) {
    const error = new Error(data?.error?.message || raw || `Anthropic error ${res.status}`);
    error.provider = 'anthropic';
    error.status = res.status;
    throw error;
  }

  const text = data.content?.[0]?.text?.trim();

  if (!text) {
    const error = new Error('Anthropic вернул пустой ответ');
    error.provider = 'anthropic';
    error.status = 502;
    throw error;
  }

  return text;
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );

  if (!isPremium) {
    return NextResponse.json({
      error: 'AI-отклики доступны только в премиум-подписке',
      premium_required: true,
    }, { status: 402 });
  }

  const body = await request.json();
  const title = cleanText(body.title, 220);
  const description = cleanText(body.description, 1400);
  const budget = cleanText(body.budget, 80);
  const source = cleanText(body.source, 80);

  const prompt = `Напиши отклик на фриланс-заказ:
Заголовок: ${title || 'не указан'}
Описание: ${description || 'не указано'}
Бюджет: ${budget || 'не указан'}
Биржа: ${source || 'не указана'}

Сделай отклик конкретным: упомяни 1-2 детали из задачи, предложи следующий шаг и не обещай лишнего.`;

  let groqError = null;

  try {
    const text = await generateWithGroq(prompt);
    if (text) return NextResponse.json({ text, provider: 'groq', model: GROQ_MODEL });
  } catch (err) {
    groqError = err;
    console.warn('[AI] Groq error:', {
      status: err.status,
      provider: err.provider,
      retryAfter: err.retryAfter,
      message: err.message,
    });
  }

  try {
    const text = await generateWithAnthropic(prompt);
    if (text) return NextResponse.json({ text, provider: 'anthropic' });
  } catch (err) {
    console.warn('[AI] Anthropic error:', {
      status: err.status,
      provider: err.provider,
      message: err.message,
    });
  }

  if (groqError?.status === 429) {
    const retryAfter = Math.min(Number(groqError.retryAfter || 20), 90);

    return NextResponse.json({
      error: `Лимит AI. Попробуй ещё раз через ${retryAfter} секунд.`,
      code: 'AI_RATE_LIMIT',
      retryAfter,
    }, {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    });
  }

  if (groqError?.name === 'AbortError') {
    return NextResponse.json({
      error: 'AI отвечает слишком долго. Попробуй ещё раз.',
      code: 'AI_TIMEOUT',
    }, { status: 504 });
  }

  return NextResponse.json({
    error: 'AI сервис временно недоступен. Можно откликнуться на проект вручную.',
    code: 'AI_UNAVAILABLE',
  }, { status: 503 });
}
