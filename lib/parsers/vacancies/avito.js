import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// ВАЖНО: у Avito нет открытого публичного API для вакансий (есть только
// партнёрский Avito Job API — по заявке и модерации, см. avito.ru/professionals).
// Этот парсер — best-effort HTML-скрейпинг публичной страницы поиска.
// Avito активно защищается от ботов, поэтому:
//   1. Селекторы ниже могут отвалиться при малейшем редизайне.
//   2. Делаем "прогрев": сначала обычный GET на главную страницу, чтобы
//      получить настоящие cookies (Avito охотнее пропускает второй запрос
//      с валидной сессией, чем холодный запрос без единого cookie — это
//      самый частый повод для мгновенного 429/403 у их антибота).
//   3. Если и это не поможет — значит у них JS-челлендж (Cloudflare-стиль),
//      который без headless-браузера (Playwright/Puppeteer) не пройти,
//      см. схему в README парсеров.

const HOME_URL = 'https://www.avito.ru/';
const SEARCH_URL = 'https://www.avito.ru/rossiya/vakansii?work_schedule=udalenno';

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.map(c => c.split(';')[0]).join('; ');
}

export async function parseAvito() {
  const results = [];

  try {
    // Шаг 1 — "прогрев": получаем реальные cookies с главной страницы.
    const homeRes = await axios.get(HOME_URL, {
      headers: BASE_HEADERS,
      timeout: 15000,
      validateStatus: () => true,
    });
    const cookies = extractCookies(homeRes.headers['set-cookie']);

    if (homeRes.status !== 200) {
      console.error(`[Avito] Главная страница отдала статус ${homeRes.status} — антибот блокирует уже на входе`);
      return results;
    }

    // Небольшая пауза перед вторым запросом — выглядит менее ботообразно.
    await new Promise(r => setTimeout(r, 800));

    // Шаг 2 — сам поиск, уже с cookies и Referer с "предыдущей" страницы.
    const res = await axios.get(SEARCH_URL, {
      headers: {
        ...BASE_HEADERS,
        'Referer': HOME_URL,
        'Sec-Fetch-Site': 'same-origin',
        ...(cookies ? { Cookie: cookies } : {}),
      },
      timeout: 20000,
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      console.error(`[Avito] Поиск отдал статус ${res.status} даже с прогретыми cookies — похоже на JS-челлендж, нужен headless-браузер`);
      return results;
    }

    const $ = cheerio.load(res.data);

    $('[data-marker="item"]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr('data-item-id');
      if (!id) return;

      const title = $el.find('[itemprop="name"], [data-marker="item-title"]').first().text().trim()
        || $el.find('h3').first().text().trim();
      if (!title) return;

      const href = $el.find('a[data-marker="item-title"], a[itemprop="url"]').first().attr('href')
        || $el.find('a').first().attr('href');
      const url = href ? (href.startsWith('http') ? href : `https://www.avito.ru${href}`) : null;
      if (!url) return;

      const priceText = $el.find('[data-marker="item-price"], [itemprop="price"]').first().text()
        .replace(/\s|\u00a0/g, '');
      const priceMatch = priceText.match(/(\d+)(?:-(\d+))?/);
      const salaryMin = priceMatch?.[1] ? Number(priceMatch[1]) : null;
      const salaryMax = priceMatch?.[2] ? Number(priceMatch[2]) : null;

      const company = $el.find('[data-marker="item-address"]').first().text().trim() || null;

      results.push({
        external_id: String(id),
        source: 'avito',
        region: 'ru',
        title,
        company,
        description: null,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: 'RUB',
        category: detectVacancyCategory(title),
        employment_type: null,
        tags: [],
        url,
        published_at: new Date().toISOString(),
      });
    });
  } catch (err) {
    console.error('[Avito] Ошибка:', err.message);
  }

  console.log(`[Avito] Собрано: ${results.length}`);
  return results;
}
