import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// ВАЖНО: у Avito нет открытого публичного API для вакансий (есть только
// партнёрский Avito Job API — по заявке и модерации, см. avito.ru/professionals).
// Этот парсер — best-effort HTML-скрейпинг публичной страницы поиска.
// Avito активно защищается от ботов (антифрод/JS-челленджи), поэтому:
//   1. Селекторы ниже могут отвалиться при малейшем редизайне — их нужно
//      будет периодически перепроверять руками (открыть страницу, посмотреть DOM).
//   2. При частых запросах Avito может начать отдавать капчу/блокировать IP —
//      не имеет смысла дёргать чаще, чем раз в несколько минут, и стоит
//      держать этот источник как "лучше, чем ничего", а не как надёжный.
//   3. Если станет часто падать — самый устойчивый вариант это подать заявку
//      на партнёрский Job API вместо скрейпинга.

const SEARCH_URL = 'https://www.avito.ru/rossiya/vakansii?work_schedule=udalenno';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

export async function parseAvito() {
  const results = [];

  try {
    const res = await axios.get(SEARCH_URL, { headers: HEADERS, timeout: 20000 });
    const $ = cheerio.load(res.data);

    // Карточки вакансий на странице поиска Avito помечены data-marker="item".
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
