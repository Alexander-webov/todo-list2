import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// career.habr.com/vacancies/remote — публичная страница, доступна без логина
// (проверено вручную). У Хабр Карьеры есть формальный "API сервиса" (см.
// career.habr.com/info/api), но это отдельная договорная история, как у HH —
// не будем на неё завязываться. Вместо этого скрейпим саму страницу поиска.
//
// Селекторы намеренно построены на структуре ссылок (/vacancies/<id>,
// /companies/<slug>), а не на CSS-классах — так меньше риска сломаться
// при редизайне вёрстки, классы меняются чаще, чем структура URL.

const BASE_URL = 'https://career.habr.com/vacancies/remote';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

const MAX_PAGES = 5;

function parseSalary(text) {
  // "от 150 000 до 200 000 ₽" | "от 300 000 ₽" | "" (не указана)
  const clean = (text || '').replace(/\s|\u00a0/g, ' ');
  const min = clean.match(/от\s*([\d\s]+)\s*₽/)?.[1]?.replace(/\s/g, '');
  const max = clean.match(/до\s*([\d\s]+)\s*₽/)?.[1]?.replace(/\s/g, '');
  return {
    salary_min: min ? Number(min) : null,
    salary_max: max ? Number(max) : null,
  };
}

async function fetchPage(page, seen, results) {
  try {
    const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);

    // Каждая карточка вакансии содержит ссылку вида /vacancies/1000166960
    const vacancyLinks = $('a[href^="/vacancies/"]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return /^\/vacancies\/\d+$/.test(href);
    });

    vacancyLinks.each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const id = href.match(/\d+/)?.[0];
      const title = $link.text().trim();
      if (!id || !title || seen.has(id)) return;
      seen.add(id);

      // Карточка целиком — берём общего родителя нужной глубины,
      // чтобы вытащить компанию/зарплату/навыки рядом с этой ссылкой.
      const $card = $link.closest('div');
      const cardText = $card.text();

      const company = $card.find('a[href^="/companies/"]').first().text().trim() || null;
      const { salary_min, salary_max } = parseSalary(cardText);
      const skills = $card
        .find('a[href*="/vacancies/skills/"], a[href^="/vacancies/programmist_"]')
        .map((__, s) => $(s).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 10);

      const textForCategory = `${title} ${skills.join(' ')}`;

      results.push({
        external_id: id,
        source: 'habrcareer',
        region: 'ru',
        title,
        company,
        description: skills.length ? `Навыки: ${skills.join(', ')}` : null,
        salary_min,
        salary_max,
        currency: 'RUB',
        category: detectVacancyCategory(textForCategory),
        employment_type: null,
        tags: skills,
        url: `https://career.habr.com${href}`,
        published_at: new Date().toISOString(), // точная дата публикации на странице списка не в машинном формате
      });
    });
  } catch (err) {
    console.error(`[HabrCareer] Ошибка на странице ${page}:`, err.message);
  }
}

export async function parseHabrCareer() {
  const results = [];
  const seen = new Set();

  // Раньше страницы 1-5 шли последовательно с паузами — независимые
  // запросы, безопасно параллелим. Небольшая цена: если реальных страниц
  // меньше 5, лишние вернут пустой список — не страшно.
  await Promise.allSettled(
    Array.from({ length: MAX_PAGES }, (_, i) => fetchPage(i + 1, seen, results))
  );

  console.log(`[HabrCareer] Собрано: ${results.length}`);
  return results;
}
