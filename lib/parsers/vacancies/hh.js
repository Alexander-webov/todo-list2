import Parser from 'rss-parser';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// ВАЖНО: это НЕ api.hh.ru (та REST-API для соискателей закрыта HH.ru
// 15.12.2025). Это публичный RSS сайта hh.ru для подписки на поиск —
// та же механика, что у "Прислать вакансии на почту", живёт годами и
// не относится к закрытому applicant API. area=113 — вся Россия.
const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9',
  },
});

const BASE = 'https://hh.ru/search/vacancy/rss';

// Несколько запросов, чтобы покрыть разные категории — один общий поток
// без text= даёт только самые свежие/популярные, не полную картину.
const QUERIES = [
  { text: '' },
  { text: 'дизайнер' },
  { text: 'frontend' },
  { text: 'backend OR python OR php' },
  { text: 'SMM' },
  { text: 'поддержка OR оператор' },
];

function buildUrl({ text }) {
  const params = new URLSearchParams({
    work_format: 'REMOTE',
    area: '113',
    ...(text ? { text } : {}),
  });
  return `${BASE}?${params.toString()}`;
}

async function fetchQuery(q, seen, results) {
  try {
    const feed = await parser.parseURL(buildUrl(q));

    for (const item of feed.items || []) {
      const idMatch = item.link?.match(/\/vacancy\/(\d+)/);
      const id = idMatch?.[1];
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const title = item.title || 'Без названия';
      const description = (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim();
      const textForCategory = `${title} ${description}`;

      // Заголовок RSS-пункта у hh.ru обычно вида "Вакансия — Компания, Город"
      const companyMatch = title.match(/[—-]\s*([^,]+)(?:,|$)/);

      results.push({
        external_id: id,
        source: 'hh',
        region: 'ru',
        title: title.split(/[—-]/)[0].trim(),
        company: companyMatch?.[1]?.trim() || null,
        description: description.slice(0, 500) || null,
        salary_min: null,
        salary_max: null,
        currency: 'RUB',
        category: detectVacancyCategory(textForCategory),
        employment_type: null,
        tags: [],
        url: item.link,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error(`[HH] Ошибка для query="${q.text}":`, err.message);
  }
}

export async function parseHH() {
  const results = [];
  const seen = new Set();

  // Раньше 6 запросов шли последовательно с паузами — независимые друг
  // от друга RSS-запросы, безопасно параллелим.
  await Promise.allSettled(QUERIES.map(q => fetchQuery(q, seen, results)));

  const filtered = results.filter(r => r.url);
  console.log(`[HH] Собрано: ${filtered.length}`);
  return filtered;
}
