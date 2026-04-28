import { detectCategory } from '../categories.js';
import { supabaseAdmin } from '../supabase.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR = process.env.APIFY_UPWORK_ACTOR || 'flash_mage~upwork';
const MIN_INTERVAL_MS = 30 * 60 * 1000;

async function shouldRun() {
  const db = supabaseAdmin();
  const { data } = await db
    .from('site_stats')
    .select('value, updated_at')
    .eq('key', 'upwork_last_scrape')
    .single();

  if (!data) {
    await db.from('site_stats').upsert({
      key: 'upwork_last_scrape',
      value: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    return true;
  }

  const elapsed = Date.now() - new Date(data.updated_at).getTime();
  if (elapsed < MIN_INTERVAL_MS) {
    console.log(`[Upwork] Пропуск — следующий запуск через ${Math.round((MIN_INTERVAL_MS - elapsed) / 60000)} мин`);
    return false;
  }
  return true;
}

async function markAsRun(count) {
  const db = supabaseAdmin();
  await db.from('site_stats').upsert({
    key: 'upwork_last_scrape',
    value: count,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
}

async function callApify(keywords, limit = 30) {
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      limit,
      fixed: true,
      hourly: true,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apify ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}

function normalizeJob(raw) {
  const id = raw.job_id || raw.id || raw.ciphertext || raw.uid ||
    (raw.url || raw.job_url || raw.link || '').match(/~(\w+)/)?.[1] ||
    String(Date.now() + Math.random());

  const url = raw.url || raw.job_url || raw.link ||
    (raw.ciphertext ? `https://www.upwork.com/jobs/${raw.ciphertext}` : '');

  const title = raw.title || raw.job_title || raw.name || '';
  if (!title || title.length < 5) return null;

  const description = (raw.description || raw.job_description || raw.snippet || raw.shortDescription || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);

  let budget = null;
  let currency = 'USD';
  if (raw.fixed_budget_amount || raw.fixedPrice || raw.budget || raw.fixed_budget) {
    budget = parseFloat(raw.fixed_budget_amount || raw.fixedPrice || raw.budget || raw.fixed_budget) || null;
  } else if (raw.hourly_max || raw.hourlyRange?.max || raw.hourly_rate_max) {
    budget = parseFloat(raw.hourly_max || raw.hourlyRange?.max || raw.hourly_rate_max) || null;
  } else if (raw.amount?.amount) {
    budget = parseFloat(raw.amount.amount) || null;
  }
  if (raw.currency) currency = raw.currency;

  const skills = raw.skills || raw.attrs || raw.requiredSkills || raw.tags || [];
  const skillNames = Array.isArray(skills)
    ? skills.map(s => typeof s === 'string' ? s : (s.name || s.prettyName || '')).filter(Boolean)
    : [];

  const textForCategory = [title, description, ...skillNames].join(' ');
  const category = detectCategory(textForCategory);

  const publishedAt = raw.ts_publish || raw.ts_create || raw.publishedOn ||
    raw.createdOn || raw.created_at || raw.postedOn ||
    raw.date_created || raw.published_date || new Date().toISOString();

  return {
    external_id: String(id),
    source: 'upwork',
    title: title.slice(0, 255),
    description,
    budget_min: budget,
    budget_max: null,
    currency,
    category,
    tags: skillNames.slice(0, 10),
    url: url || `https://www.upwork.com/search/jobs/?q=${encodeURIComponent(title.slice(0, 50))}`,
    referral_url: url,
    published_at: new Date(publishedAt).toISOString(),
  };
}

export async function parseUpwork() {
  if (!APIFY_TOKEN) {
    console.log('[Upwork] APIFY_TOKEN не задан — пропуск');
    return [];
  }

  const ready = await shouldRun();
  if (!ready) return [];

  console.log(`[Upwork] Запуск через Apify (${APIFY_ACTOR})...`);

  const KEYWORD_GROUPS = [
    ['web development', 'javascript', 'react'],
    ['python', 'design', 'wordpress'],
    ['mobile app', 'backend', 'frontend'],
  ];

  const results = [];
  const seen = new Set();

  for (const keywords of KEYWORD_GROUPS) {
    try {
      console.log(`[Upwork] Запрос: ${keywords.join(', ')}...`);
      const items = await callApify(keywords, 30);

      if (!Array.isArray(items)) {
        console.error(`[Upwork] Неожиданный формат от Apify`);
        continue;
      }

      for (const raw of items) {
        const project = normalizeJob(raw);
        if (!project) continue;
        if (seen.has(project.external_id)) continue;
        seen.add(project.external_id);
        results.push(project);
      }

      console.log(`[Upwork] +${items.length} (всего ${results.length})`);
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`[Upwork] Ошибка:`, err.message);
      if (err.message.includes('402') || err.message.includes('403') || err.message.includes('429') || err.message.includes('401')) {
        console.error('[Upwork] Лимит/аренда/токен — стоп');
        break;
      }
    }
  }

  if (results.length > 0) {
    await markAsRun(results.length);
  }

  console.log(`[Upwork] Собрано: ${results.length}`);
  return results;
}
