import Parser from 'rss-parser';
import { detectVacancyCategory } from '../../vacancyCategories.js';

const rss = new Parser({ timeout: 15000 });

// WWR отдаёт отдельный RSS на каждую рубрику — берём те, что релевантны нашим категориям.
const FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
  'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
  'https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss',
];

function splitTitle(rawTitle = '') {
  // Заголовки WWR обычно вида "Компания: Позиция"
  const idx = rawTitle.indexOf(':');
  if (idx === -1) return { company: null, title: rawTitle.trim() };
  return { company: rawTitle.slice(0, idx).trim(), title: rawTitle.slice(idx + 1).trim() };
}

export async function parseWWR() {
  const results = [];
  const seen = new Set();

  for (const feedUrl of FEEDS) {
    try {
      const feed = await rss.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const guid = item.guid || item.link;
        if (!guid || seen.has(guid)) continue;
        seen.add(guid);

        const { company, title } = splitTitle(item.title);
        const description = (item.contentSnippet || item.content || '').slice(0, 500);
        const text = `${title} ${description} ${item.categories?.join(' ') || ''}`;

        results.push({
          external_id: guid,
          source: 'wwr',
          region: 'world',
          title: title || item.title,
          company,
          description,
          salary_min: null,
          salary_max: null,
          currency: 'USD',
          category: detectVacancyCategory(text),
          employment_type: null,
          tags: item.categories || [],
          url: item.link,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[WWR] Ошибка для ${feedUrl}:`, err.message);
    }
  }

  console.log(`[WWR] Собрано: ${results.length}`);
  return results;
}
