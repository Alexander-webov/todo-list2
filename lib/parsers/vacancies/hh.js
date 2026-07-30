import axios from 'axios';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// api.hh.ru — публичный API, ключ не нужен, но нужен корректный User-Agent
// (HH требует указывать контакт в UA, иначе может резать лимиты).
const BASE_URL = 'https://api.hh.ru/vacancies';
const HEADERS = {
  'User-Agent': 'AllFreelancersHere/1.0 (contact: admin@allfreelancershere.ru)',
  'Accept': 'application/json',
};

// area=113 — Россия целиком. schedule=remote — фильтр "удалённая работа".
// Разбиваем по нескольким текстовым запросам, чтобы покрыть разные категории
// (у HH лимит 2000 результатов на один запрос, поэтому один общий запрос
// без text= не даст полноты по всем нишам).
const QUERIES = [
  '', // общий поток последних удалённых вакансий
  'дизайнер',
  'frontend OR "front-end" OR верстальщик',
  'backend OR "back-end" OR python OR php',
  'SMM OR "менеджер соцсетей"',
  'поддержка OR оператор OR "без опыта"',
];

async function fetchPage(text, page) {
  const res = await axios.get(BASE_URL, {
    headers: HEADERS,
    timeout: 15000,
    params: {
      schedule: 'remote',
      area: 113,
      per_page: 50,
      page,
      order_by: 'publication_time',
      ...(text ? { text } : {}),
    },
  });
  return res.data;
}

export async function parseHH() {
  const results = [];
  const seen = new Set();

  for (const text of QUERIES) {
    try {
      for (let page = 0; page < 3; page++) {
        const json = await fetchPage(text, page);
        const items = json?.items || [];
        if (items.length === 0) break;

        for (const v of items) {
          if (!v.id || seen.has(v.id)) continue;
          seen.add(v.id);

          const salaryMin = v.salary?.from ?? null;
          const salaryMax = v.salary?.to ?? null;
          const currency = v.salary?.currency || 'RUR';
          const text_ = `${v.name} ${v.snippet?.requirement || ''} ${v.snippet?.responsibility || ''}`;

          results.push({
            external_id: String(v.id),
            source: 'hh',
            region: 'ru',
            title: v.name,
            company: v.employer?.name || null,
            description: [v.snippet?.requirement, v.snippet?.responsibility].filter(Boolean).join(' ').slice(0, 500),
            salary_min: salaryMin,
            salary_max: salaryMax,
            currency: currency === 'RUR' ? 'RUB' : currency,
            category: detectVacancyCategory(text_),
            employment_type: v.employment?.name || null,
            tags: [],
            url: v.alternate_url,
            published_at: v.published_at ? new Date(v.published_at).toISOString() : new Date().toISOString(),
          });
        }

        if (page + 1 >= (json?.pages || 1)) break;
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error(`[HH] Ошибка для query="${text}":`, err.message);
    }
  }

  console.log(`[HH] Собрано: ${results.length}`);
  return results;
}
