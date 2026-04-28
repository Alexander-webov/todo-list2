import axios from 'axios';
import FormData from 'form-data';
import { detectCategory } from '../categories.js';

const KWORK_BASE = 'https://kwork.ru';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': KWORK_BASE,
  'Referer': `${KWORK_BASE}/projects`,
};

const CATEGORY_NAMES = {
  '1': 'FrontEnd', '2': 'WordPress / Tilda / CMS', '3': 'Другое',
  '4': 'Графический дизайн', '5': 'Web дизайн', '6': 'Другое', '7': 'SMM',
  '8': 'SMM', '9': 'Парсинг', '10': 'BackEnd', '11': 'Вёрстка',
  '12': 'WordPress / Tilda / CMS', '13': 'BackEnd', '14': 'Графический дизайн', '15': 'Другое',
  '16': 'SMM', '17': 'Парсинг', '18': 'Другое', '19': 'Другое',
  '20': 'Графический дизайн', '21': 'Другое', '22': 'SMM', '23': 'Парсинг',
  '24': 'BackEnd', '25': 'FrontEnd', '26': 'Графический дизайн', '27': 'Другое',
  '28': 'Видеомонтаж', '29': 'SMM', '30': 'Парсинг',
};

async function fetchPage(page) {
  const form = new FormData();
  form.append('a', '1');
  form.append('page', String(page));
  const res = await axios.post(`${KWORK_BASE}/projects`, form, {
    headers: { ...HEADERS, ...form.getHeaders() },
    timeout: 20000,
  });
  return res.data;
}

export async function parseKwork() {
  const results = [];
  const seen = new Set();

  for (let page = 1; page <= 5; page++) {
    try {
      const json = await fetchPage(page);

      if (!json?.success || !json?.data?.pagination?.data) {
        console.log(`[Kwork] Страница ${page}: неожиданная структура`);
        break;
      }

      const items = json.data.pagination.data;
      if (items.length === 0) {
        console.log(`[Kwork] Страница ${page} пустая — стоп`);
        break;
      }

      for (const item of items) {
        if (!item.id || seen.has(item.id)) continue;
        seen.add(item.id);

        const rawDesc = item.description || '';
        const description = cleanHtml(rawDesc);
        const title = item.name || item.title ||
          description.replace(/\n/g, ' ').slice(0, 100) +
          (description.length > 100 ? '...' : '');

        const url = `${KWORK_BASE}/projects/${item.id}`;
        const budget = item.possiblePriceLimit ? parseFloat(item.possiblePriceLimit) : null;
        // Анализируем текст проекта — точнее чем Kwork ID категорий
        const textCategory = detectCategory(title + ' ' + description);
        const category = textCategory !== 'Другое'
          ? textCategory
          : (CATEGORY_NAMES[String(item.category_id)] || 'Другое');

        // Данные заказчика
        const userId = item.user?.USERID || null;
        const userName = item.user?.username || null;

        results.push({
          external_id: String(item.id),
          source: 'kwork',
          title: title || 'Проект на Kwork',
          description: description.slice(0, 500),
          budget_min: budget,
          budget_max: null,
          currency: 'RUB',
          category,
          tags: [],
          url,
          referral_url: url,
          published_at: new Date().toISOString(),
          customer_external_id: userId ? String(userId) : null,
          customer_source: 'kwork',
        });
      }

      console.log(`[Kwork] Страница ${page}: ${items.length} проектов`);
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`[Kwork] Ошибка страницы ${page}:`, err.message);
      break;
    }
  }

  console.log(`[Kwork] Итого: ${results.length}`);
  return results;
}

function cleanHtml(str) {
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}


