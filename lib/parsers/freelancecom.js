import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '../categories.js';

const BASE = 'https://www.freelance.com';
const PAGES = [
  '/jobs',
  '/jobs?sort=newest',
  '/jobs/web-development',
  '/jobs/graphic-design',
  '/jobs/programming',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function parseFreelanceCom() {
  const results = [];
  const seen = new Set();

  for (const path of PAGES) {
    try {
      const { data: html } = await axios.get(`${BASE}${path}`, {
        headers: HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      // Generic job listing selectors
      $('[class*="job"], [class*="project"], article, .listing').each((_, el) => {
        const $el = $(el);

        const titleEl = $el.find('h2 a, h3 a, [class*="title"] a').first();
        const title = titleEl.text().trim();
        const href = titleEl.attr('href');
        if (!title || !href) return;

        const url = href.startsWith('http') ? href : `${BASE}${href}`;
        const externalId = href.match(/\/(\d+)/)?.[1] || href.split('/').filter(Boolean).pop();
        if (!externalId || seen.has(externalId)) return;
        seen.add(externalId);

        const description = $el.find('[class*="desc"], p, [class*="snippet"]').first().text().trim();

        const budgetText = $el.find('[class*="budget"], [class*="price"]').first().text().trim();
        const budgetMatch = budgetText.match(/\$\s*([\d,]+)/);
        const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null;

        results.push({
          external_id: String(externalId),
          source: 'freelancecom',
          title,
          description: description.slice(0, 500),
          budget_min: budget,
          budget_max: null,
          currency: 'USD',
          category: detectCategory(title + ' ' + description),
          tags: [],
          url,
          referral_url: url,
          published_at: new Date().toISOString(),
        });
      });

      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.error(`[Freelance.com] Ошибка ${path}:`, err.message);
    }
  }

  console.log(`[Freelance.com] Собрано: ${results.length}`);
  return results;
}
