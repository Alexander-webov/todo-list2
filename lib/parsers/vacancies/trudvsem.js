import axios from 'axios';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// opendata.trudvsem.ru — официальный открытый API портала «Работа России»
// (Роструд). Без ключей, без авторизации, специально предназначен для
// агрегаторов вроде нас (у них даже есть публичная страница с партнёрами,
// использующими эти данные: trudvsem.ru/opendata/media-partners).
// ВАЖНО: у полей в ответе API дефисы в названиях (job-name, creation-date),
// поэтому обращаемся через bracket-нотацию, а не через точку.

const API_URL = 'https://opendata.trudvsem.ru/api/v1/vacancies';

// У API нет отдельного флага "только удалёнка" — фильтруем по тексту
// вакансии и графику работы после получения, плюс несколько релевантных
// текстовых запросов, чтобы не перебирать вообще все вакансии РФ (их там
// больше миллиона).
const QUERIES = [
  'удаленная работа',
  'удаленно программист',
  'удаленно дизайнер',
  'удаленный SMM',
  'remote developer',
  'удаленная работа поддержка',
];

async function fetchPage(text, offset) {
  const res = await axios.get(API_URL, {
    timeout: 20000,
    params: { text, limit: 100, offset },
  });
  return res.data;
}

function isRemote(v) {
  const text = `${v['job-name'] || ''} ${v.schedule?.name || v.schedule || ''} ${v.employment?.name || v.employment || ''}`.toLowerCase();
  return /удал[её]нн|remote/.test(text);
}

// У Trudvsem гос-вакансии не всегда протухают вовремя — попадаются
// объявления многолетней давности. Чистка по возрасту в кроне срабатывает
// ДО парсинга, так что без фильтра здесь свежедобавленные старые записи
// висели бы в ленте до следующего цикла. Отсеиваем сразу.
const MAX_AGE_DAYS = 7;
function isFresh(dateStr) {
  if (!dateStr) return false;
  const ageMs = Date.now() - new Date(dateStr).getTime();
  return ageMs < MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

async function fetchQuery(text, seen, results) {
  try {
    for (let offset = 0; offset < 3; offset++) {
      const json = await fetchPage(text, offset);
      const items = json?.results?.vacancies || [];
      if (items.length === 0) break;

      for (const rec of items) {
        const v = rec.vacancy;
        if (!v?.id || seen.has(v.id)) continue;
        if (!isRemote(v)) continue;
        if (!isFresh(v['creation-date'])) continue;
        seen.add(v.id);

        const jobName = v['job-name'] || 'Без названия';
        const duty = v.duty || v.requirement || '';
        const textForCategory = `${jobName} ${duty}`;

        results.push({
          external_id: String(v.id),
          source: 'trudvsem',
          region: 'ru',
          title: jobName,
          company: v.company?.name || null,
          description: duty ? String(duty).slice(0, 500) : null,
          salary_min: v.salary_min || null,
          salary_max: v.salary_max || null,
          currency: 'RUB',
          category: detectVacancyCategory(textForCategory),
          employment_type: v.employment?.name || v.employment || null,
          tags: [],
          url: v.vac_url || null,
          published_at: v['creation-date'] ? new Date(v['creation-date']).toISOString() : new Date().toISOString(),
        });
      }

      if (items.length < 100) break; // последняя страница
      await new Promise(r => setTimeout(r, 250));
    }
  } catch (err) {
    console.error(`[Trudvsem] Ошибка для query="${text}":`, err.message);
  }
}

export async function parseTrudvsem() {
  const results = [];
  const seen = new Set();

  // Раньше все 6 тем шли последовательно (до 18 запросов подряд с паузами) —
  // это было основным вкладом в общее время выполнения крона вакансий.
  // Темы друг от друга не зависят, кроме общего Set для дедупликации —
  // он безопасно расшаривается между параллельными вызовами, так как
  // JS single-threaded и мутации Set/массива между await не гонятся.
  await Promise.allSettled(QUERIES.map(text => fetchQuery(text, seen, results)));

  const filtered = results.filter(r => r.url);
  console.log(`[Trudvsem] Собрано: ${filtered.length}`);
  return filtered;
}
