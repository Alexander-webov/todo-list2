import { supabaseAdmin } from './supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CHANNEL_RU = process.env.TELEGRAM_CHANNEL_RU;
const CHANNEL_INT = process.env.TELEGRAM_CHANNEL_INT;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

const RU_SOURCE_KEYS = ['fl', 'kwork', 'freelanceru', 'youdo'];
const AD_EVERY_N_POSTS = 15;

// Минимальный бюджет для публикации в канал (₽ для РУ, $ для INT)
const MIN_BUDGET_RU = 5000;
const MIN_BUDGET_INT = 100;

// Только эти категории публикуются в канал
const ALLOWED_CATEGORIES = [
  'Видеомонтаж',
  'Графический дизайн',
  'Web дизайн',
  'Вёрстка',
  'WordPress / Tilda / CMS',
  'FrontEnd',
  'BackEnd',
];

const SOURCE_NAMES = {
  fl: 'FL.ru',
  kwork: 'Kwork',
  freelanceru: 'Freelance.ru',
  youdo: 'Youdo',
  freelancer: 'Freelancer.com',
  peopleperhour: 'PeoplePerHour',
  guru: 'Guru.com',
};

const CATEGORY_EMOJI = {
  'WordPress / Tilda / CMS': '🌐',
  'Видеомонтаж': '🎬',
  'Графический дизайн': '🎨',
  'Web дизайн': '🖥',
  'SMM': '📱',
  'Парсинг': '🤖',
  'Вёрстка': '📐',
  'FrontEnd': '⚛️',
  'BackEnd': '🔧',
  'Другое': '📌',
};

const CATEGORY_HASHTAGS = {
  'WordPress / Tilda / CMS': '#WordPress #CMS #Сайт',
  'Видеомонтаж': '#Видеомонтаж #Видео #Reels',
  'Графический дизайн': '#Дизайн #Логотип #Графика',
  'Web дизайн': '#WebДизайн #UI #Figma',
  'SMM': '#SMM #Маркетинг #Контент',
  'Парсинг': '#Парсинг #Боты #Автоматизация',
  'Вёрстка': '#Вёрстка #HTML #CSS',
  'FrontEnd': '#FrontEnd #React #JavaScript',
  'BackEnd': '#BackEnd #Python #PHP',
  'Другое': '#Фриланс #Работа',
};

// Спам-фильтр
const SPAM_PATTERNS = /заработок.*интернет|млм|mlm|сетевой.*маркетинг|пирамид|казино|casino|ставки.*спорт|букмекер|лёгкие.*деньги|легкие.*деньги|без.*вложений|пассивный.*доход.*гарантир|обман|развод|мошенник|написать.*в.*лс|подробности.*в.*лс|crypto.*invest|passive.*income.*guaranteed/i;

// ─── Базовая отправка ───

export async function sendTelegramMessage(chatId, text, options = {}) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: 'HTML',
        disable_web_page_preview: true, ...options,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      if (err.error_code !== 403) console.error('[Telegram] error:', err);
      return null;
    }
    return (await res.json()).result;
  } catch (err) {
    console.error('[Telegram] fetch error:', err.message);
    return null;
  }
}

async function deleteTelegramMessage(chatId, messageId) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch (err) {
    console.error('[Telegram] delete error:', err.message);
  }
}

// ─── УМНЫЙ ОТБОР ЛУЧШИХ ЗАКАЗОВ ───

export function scoreProject(project) {
  let score = 0;
  const text = `${project.title} ${project.description || ''}`.toLowerCase();

  // Категория не в списке → не публикуем
  if (!ALLOWED_CATEGORIES.includes(project.category || 'Другое')) return -1000;

  // Спам → сразу -1000
  if (SPAM_PATTERNS.test(text)) return -1000;

  // Бюджет — главный фактор
  const budget = project.budget_min || 0;
  const isRu = RU_SOURCE_KEYS.includes(project.source);

  if (isRu) {
    if (budget >= 100000) score += 50;
    else if (budget >= 50000) score += 40;
    else if (budget >= 20000) score += 30;
    else if (budget >= 10000) score += 20;
    else if (budget >= MIN_BUDGET_RU) score += 10;
    else if (budget > 0) score += 2; // маленький бюджет
    else score += 0; // бюджет не указан — нейтрально
  } else {
    if (budget >= 5000) score += 50;
    else if (budget >= 2000) score += 40;
    else if (budget >= 1000) score += 30;
    else if (budget >= 500) score += 20;
    else if (budget >= MIN_BUDGET_INT) score += 10;
    else if (budget > 0) score += 2;
    else score += 0;
  }

  // Качество описания
  const descLen = (project.description || '').length;
  if (descLen > 200) score += 15;
  else if (descLen > 100) score += 10;
  else if (descLen > 50) score += 5;
  else score -= 5; // слишком короткое

  // Заголовок содержит конкретику
  if (project.title.length > 20) score += 5;
  if (project.title.length < 10) score -= 10;

  // Бонус за конкретные навыки/технологии в тексте
  if (/react|vue|angular|next|node|python|django|laravel|figma|flutter/i.test(text)) score += 5;

  return score;
}

// ─── ФОРМАТИРОВАНИЕ ПОСТА ───

function formatChannelPost(project, totalToday) {
  const catEmoji = CATEGORY_EMOJI[project.category] || '📌';
  const hashtags = CATEGORY_HASHTAGS[project.category] || '#Фриланс';

  // Бюджет
  let budgetLine = '';
  if (project.budget_min) {
    const curr = project.currency === 'USD' ? '$' : '₽';
    budgetLine = `💰 Бюджет: ${curr === '$' ? '$' : ''}${project.budget_min.toLocaleString('ru')}${curr === '₽' ? '₽' : ''}`;
    if (project.budget_max && project.budget_max !== project.budget_min) {
      budgetLine += ` – ${curr === '$' ? '$' : ''}${project.budget_max.toLocaleString('ru')}${curr === '₽' ? '₽' : ''}`;
    }
  }

  // Описание — чистим и обрезаем
  const rawDesc = (project.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const desc = rawDesc.slice(0, 250) + (rawDesc.length > 250 ? '...' : '');

  // Ссылка — ТОЛЬКО на наш сайт (не на биржу!)
  const projectUrl = project.id
    ? `${SITE_URL}/projects/${project.id}`
    : SITE_URL;

  let text = `${catEmoji} <b>${project.title.slice(0, 120)}</b>\n\n`;

  if (budgetLine) text += `${budgetLine}\n`;
  text += `🌍 Удалённо · ${SOURCE_NAMES[project.source] || project.source}\n\n`;

  if (desc && desc.length > 30) {
    text += `${desc}\n\n`;
  }

  text += `👉 <a href="${projectUrl}">Откликнуться</a>\n\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `${hashtags}\n`;
  text += `⚡ <a href="${SITE_URL}">allFreelancersHere</a> — ${totalToday.toLocaleString('ru')}+ заказов сегодня`;

  return text;
}

// ─── ПЛАТНАЯ РЕКЛАМА ───

export async function isPinnedAdActive() {
  const db = supabaseAdmin();
  const { data: ads } = await db
    .from('ads').select('id, tg_posted_at, tg_pin_hours')
    .not('tg_posted_at', 'is', null)
    .or('position.eq.telegram,position.eq.all')
    .eq('is_active', true);
  if (!ads?.length) return false;
  const now = Date.now();
  for (const ad of ads) {
    const pinMs = (ad.tg_pin_hours || 2) * 60 * 60 * 1000;
    if (now - new Date(ad.tg_posted_at).getTime() < pinMs) {
      console.log(`[Telegram] Каналы на паузе — платная реклама`);
      return true;
    }
  }
  return false;
}

export async function cleanupExpiredAds() {
  const db = supabaseAdmin();
  const { data: ads } = await db
    .from('ads').select('id, tg_posted_at, tg_keep_hours, tg_message_id')
    .not('tg_posted_at', 'is', null).not('tg_message_id', 'is', null);
  if (!ads?.length) return;
  const now = Date.now();
  for (const ad of ads) {
    const keepMs = (ad.tg_keep_hours || 48) * 60 * 60 * 1000;
    if (now - new Date(ad.tg_posted_at).getTime() > keepMs) {
      console.log(`[Telegram] Удаляю рекламный пост (${ad.tg_keep_hours}ч истекли)`);
      if (CHANNEL_RU) await deleteTelegramMessage(CHANNEL_RU, ad.tg_message_id);
      if (CHANNEL_INT) await deleteTelegramMessage(CHANNEL_INT, ad.tg_message_id);
      await db.from('ads').update({ tg_posted_at: null, tg_message_id: null }).eq('id', ad.id);
    }
  }
}

export async function postPaidAdToChannel(adId) {
  if (!BOT_TOKEN || (!CHANNEL_RU && !CHANNEL_INT)) return { ok: false, error: 'Каналы не настроены' };
  const db = supabaseAdmin();
  const { data: ad } = await db.from('ads').select('*').eq('id', adId).single();
  if (!ad) return { ok: false, error: 'Объявление не найдено' };

  let text = `📣 <b>Реклама</b>\n\n<b>${ad.title}</b>\n\n`;
  if (ad.description) text += `${ad.description}\n\n`;
  text += `🔗 <a href="${ad.link}">Подробнее →</a>\n\n`;
  text += `━━━━━━━━━━━━━━━━\n⚡ <a href="${SITE_URL}">allFreelancersHere</a> — все заказы в одном месте`;

  let msgId = null;
  if (CHANNEL_RU) { const r = await sendTelegramMessage(CHANNEL_RU, text); if (r) msgId = r.message_id; }
  if (CHANNEL_INT) { await sendTelegramMessage(CHANNEL_INT, text); }

  if (!msgId) return { ok: false, error: 'Ошибка отправки' };

  await db.from('ads').update({
    tg_posted_at: new Date().toISOString(),
    tg_message_id: msgId,
    views: (ad.views || 0) + 1,
  }).eq('id', ad.id);

  return { ok: true, message_id: msgId };
}

export async function postFreeAdToChannel(channelId) {
  const db = supabaseAdmin();
  const { data: ads } = await db.from('ads').select('*')
    .eq('is_active', true).or('position.eq.telegram,position.eq.all')
    .is('tg_posted_at', null).order('priority', { ascending: false }).limit(1);
  if (!ads?.length) return;
  const ad = ads[0];
  let text = `📣 <b>${ad.title}</b>\n\n`;
  if (ad.description) text += `${ad.description}\n\n`;
  text += `🔗 <a href="${ad.link}">Подробнее →</a>\n\n`;
  text += `━━━━━━━━━━━━━━━━\n⚡ <a href="${SITE_URL}">allFreelancersHere</a>`;
  await sendTelegramMessage(channelId, text);
  await db.from('ads').update({ views: (ad.views || 0) + 1 }).eq('id', ad.id);
}

export async function getAndIncrementPostCount() {
  const db = supabaseAdmin();
  const { data } = await db.from('site_stats').select('value').eq('key', 'telegram_channel_post_count').single();
  const count = (data?.value || 0) + 1;
  await db.from('site_stats').update({ value: count, updated_at: new Date().toISOString() }).eq('key', 'telegram_channel_post_count');
  return count;
}

// ─── Получаем общее число проектов за сегодня ───

export async function getTodayProjectCount() {
  const db = supabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await db
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());
  return count || 0;
}

// ─── ЛИЧНЫЕ УВЕДОМЛЕНИЯ ───

function formatPrivateNotification(project) {
  const source = SOURCE_NAMES[project.source] || project.source;
  const budget = project.budget_min
    ? `💰 <b>${project.budget_min.toLocaleString('ru')} ${project.currency === 'USD' ? '$' : '₽'}</b>`
    : '💰 Бюджет не указан';
  return (
    `🆕 <b>${source}</b>\n\n` +
    `📌 <b>${project.title.slice(0, 100)}</b>\n\n` +
    `${budget}\n` +
    (project.category ? `📂 ${project.category}\n\n` : '\n') +
    `<a href="${project.referral_url || project.url}">👉 Открыть проект</a>`
  );
}

// ─── ОСНОВНАЯ ФУНКЦИЯ ───
// ВАЖНО: Больше НЕ постит в публичные каналы напрямую. Кладёт проекты в очередь
// posting_queue. Постинг из очереди делает отдельный cron: /api/cron/post-telegram-queue.
// Личные уведомления шлёт как раньше — сразу.

export async function sendNewProjectNotifications(newProjects) {
  if (!BOT_TOKEN || !newProjects?.length) return;
  const db = supabaseAdmin();

  await cleanupExpiredAds();

  const totalToday = await getTodayProjectCount();

  // === 1. ДОБАВЛЕНИЕ В ОЧЕРЕДЬ постинга в публичные каналы ===
  const hasChannels = CHANNEL_RU || CHANNEL_INT;
  if (hasChannels) {
    const queueRows = [];
    for (const project of newProjects) {
      const score = scoreProject(project);
      if (score <= -1000) continue; // спам или неразрешённая категория — в очередь не кладём

      const isRu = RU_SOURCE_KEYS.includes(project.source);
      const targetChannel = isRu ? 'ru' : 'int';

      // Если канал для этого региона не настроен — пропускаем
      if (targetChannel === 'ru' && !CHANNEL_RU) continue;
      if (targetChannel === 'int' && !CHANNEL_INT) continue;

      queueRows.push({
        project_id: project.id,
        source: project.source,
        category: project.category || 'Другое',
        title: project.title,
        target_channel: targetChannel,
        telegram_text: formatChannelPost(project, totalToday),
        score,
        status: 'pending',
      });
    }

    if (queueRows.length > 0) {
      const { error } = await db
        .from('posting_queue')
        .upsert(queueRows, { onConflict: 'project_id,target_channel', ignoreDuplicates: true });
      if (error) console.error('[PostingQueue] Ошибка вставки:', error.message);
      else console.log(`[PostingQueue] В очередь добавлено: ${queueRows.length} из ${newProjects.length}`);
    }
  }

  // === 2. ЛИЧНЫЕ УВЕДОМЛЕНИЯ — только премиум-пользователи ===
  // Премиум-фича: чтобы попасть в рассылку, нужна активная подписка.
  // Условие: is_premium=true И (premium_until IS NULL ИЛИ premium_until > now).
  const nowIso = new Date().toISOString();
  const { data: allProfiles } = await db
    .from('profiles')
    .select('telegram_chat_id, filter_categories, filter_sources, filter_keywords, is_premium, premium_until')
    .not('telegram_chat_id', 'is', null)
    .eq('is_premium', true)
    .or(`premium_until.is.null,premium_until.gt.${nowIso}`);
  if (!allProfiles?.length) return;

  for (const user of allProfiles) {
    const filterCategories = (user.filter_categories || []).filter(Boolean);
    const filterSources = (user.filter_sources || []).filter(Boolean);
    const filterKeywords = (user.filter_keywords || []).filter(Boolean);

    const filtered = newProjects.filter(p => {
      if (filterSources.length > 0 && !filterSources.includes(p.source)) return false;
      if (filterCategories.length > 0 && !filterCategories.includes(p.category || 'Другое')) return false;
      if (filterKeywords.length > 0) {
        const hay = `${p.title} ${p.description || ''}`.toLowerCase();
        return filterKeywords.some(kw => hay.includes(kw.toLowerCase()));
      }
      return true;
    });

    for (const project of filtered.slice(0, 3)) {
      await sendTelegramMessage(user.telegram_chat_id, formatPrivateNotification(project), {
        reply_markup: { inline_keyboard: [[{ text: '👉 Открыть проект', url: project.referral_url || project.url }]] },
      });
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

// ─── ВЫБОР КАНАЛА ПО КЛЮЧУ (для cron-воркера очереди) ───
export function resolveChannelId(targetChannel) {
  if (targetChannel === 'ru') return CHANNEL_RU;
  if (targetChannel === 'int') return CHANNEL_INT;
  return null;
}

export { AD_EVERY_N_POSTS, RU_SOURCE_KEYS };
