import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '../categories.js';

const BASE = 'https://www.peopleperhour.com';
const PAGES = [
  '/freelance-jobs',
  '/freelance-jobs/technology-programming',
  '/freelance-jobs/design',
  '/freelance-jobs/digital-marketing',
  '/freelance-jobs/writing-translation',
  '/freelance-jobs/social-media',
  '/freelance-jobs/video-photography',
  '/freelance-jobs/artificial-intelligence',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

export async function parsePeoplePerHour() {
  const results = [];
  const seen = new Set();

  for (const path of PAGES) {
    try {
      const { data: html } = await axios.get(`${BASE}${path}`, {
        headers: HEADERS,
        timeout: 20000,
      });

      const $ = cheerio.load(html);

      // PPH job links: /freelance-jobs/{cat}/{subcat}/{title-slug}-{id}
      $('a[href*="/freelance-jobs/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        const title = $a.text().trim();

        // Real jobs have 3+ path segments and end with a numeric ID
        const match = href.match(/\/freelance-jobs\/[^/]+\/[^/]+\/(.+?)-(\d{5,})$/);
        if (!match || !title || title.length < 10) return;

        const externalId = match[2];
        if (seen.has(externalId)) return;
        seen.add(externalId);

        const url = href.startsWith('http') ? href : `${BASE}${href}`;

        // Description from parent container
        const $parent = $a.closest('li, div, article');
        const parentText = $parent.text() || '';
        const descText = parentText.replace(title, '').replace(/\s+/g, ' ').trim();
        const description = descText.slice(0, 500);

        // Budget
        const budgetMatch = parentText.match(/[\$\xA3\u20AC]\s*([\d,]+(?:\.\d{1,2})?)/);
        const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null;
        const currency = parentText.includes('\xA3') ? 'GBP' : 'USD';

        results.push({
          external_id: String(externalId),
          source: 'peopleperhour',
          title,
          description,
          budget_min: budget,
          budget_max: null,
          currency,
          category: detectCategory(title + ' ' + description),
          tags: [],
          url,
          referral_url: url,
          published_at: new Date().toISOString(),
        });
      });

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[PeoplePerHour] Ошибка ${path}:`, err.message);
    }
  }

  console.log(`[PeoplePerHour] Собрано: ${results.length}`);
  return results;
}
