import Parser from 'rss-parser';
import { detectVacancyCategory } from '../../vacancyCategories.js';

// himalayas.app/jobs/rss — официально документированный публичный RSS,
// прямо предназначенный для бэкфилла других job-бордов (см.
// himalayas.app/rss). Единственное условие использования — ссылаться на
// оригинал как на источник, что мы и так делаем через url каждой вакансии
// и бейдж источника в карточке.
const FEED_URL = 'https://himalayas.app/jobs/rss';

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['himalayasJobs:companyName', 'companyName'],
      ['himalayasJobs:locationRestriction', 'locationRestriction'],
    ],
  },
});

export async function parseHimalayas() {
  const results = [];

  try {
    const feed = await parser.parseURL(FEED_URL);

    for (const item of feed.items || []) {
      if (!item.link) continue;

      const description = (item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim();
      const categories = Array.isArray(item.categories) ? item.categories : [];
      const textForCategory = `${item.title || ''} ${description} ${categories.join(' ')}`;

      results.push({
        external_id: item.link, // у Himalayas нет отдельного числового id в RSS — используем ссылку
        source: 'himalayas',
        region: 'world',
        title: item.title || 'Без названия',
        company: item.companyName || null,
        description: description.slice(0, 500) || null,
        salary_min: null,
        salary_max: null,
        currency: 'USD',
        category: detectVacancyCategory(textForCategory),
        employment_type: null,
        tags: categories.slice(0, 10),
        url: item.link,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Himalayas] Ошибка:', err.message);
  }

  console.log(`[Himalayas] Собрано: ${results.length}`);
  return results;
}
