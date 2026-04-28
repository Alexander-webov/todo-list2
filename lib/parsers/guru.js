import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '../categories.js';

const BASE = 'https://www.guru.com';

// Главная страница джобов + категории (каждая даёт разный набор)
const PAGES = [
  '/d/jobs/',
  '/d/jobs/c/programming-development/',
  '/d/jobs/c/design-art/',
  '/d/jobs/c/writing-translation/',
  '/d/jobs/c/sales-marketing/',
  '/d/jobs/c/administrative-secretarial/',
  '/d/jobs/c/business-finance/',
  '/d/jobs/c/engineering-architecture/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function parseGuru() {
  const results = [];
  const seen = new Set();

  for (const path of PAGES) {
    try {
      const { data: html } = await axios.get(`${BASE}${path}`, {
        headers: HEADERS,
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      // Реальные job-ссылки: /jobs/{slug}/{id}&SearchUrl=... или /jobs/{slug}/{id}
      // ID — это числа в конце, минимум 6 цифр
      $('a[href*="/jobs/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        const title = $a.text().trim();

        // Проверяем что это реальная ссылка на джоб: /jobs/{slug}/{id}
        const match = href.match(/\/jobs\/([^/]+)\/(\d{6,})/);
        if (!match || !title || title.length < 10) return;

        const externalId = match[2];
        if (seen.has(externalId)) return;
        seen.add(externalId);

        // Чистим URL от &SearchUrl= параметров
        const cleanHref = href.split('&')[0];
        const url = cleanHref.startsWith('http') ? cleanHref : `${BASE}${cleanHref}`;

        // Ищем контейнер джоба (li, article, div) с данными
        const $parent = $a.closest('li, article, [class*="jobRecord"], [class*="job-item"]');
        const parentText = $parent.text() || $a.parent().text() || '';
        
        const descText = parentText.replace(title, '').replace(/\s+/g, ' ').trim();
        const description = descText.slice(0, 500);

        // Бюджет: $250-$500, $1k-$2.5k, Fixed Price
        let budget = null;
        const rangeMatch = parentText.match(/\$\s*([\d.,]+)(k|K)?\s*[-\u2013\u2014]\s*\$\s*([\d.,]+)(k|K)?/);
        const singleMatch = !rangeMatch && parentText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)(k|K)?/);
        
        if (rangeMatch) {
          let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
          if (rangeMatch[2]) min *= 1000;
          budget = min;
        } else if (singleMatch) {
          let val = parseFloat(singleMatch[1].replace(/,/g, ''));
          if (singleMatch[2]) val *= 1000;
          budget = val;
        }

        results.push({
          external_id: String(externalId),
          source: 'guru',
          title,
          description,
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

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[Guru] Ошибка ${path}:`, err.message);
    }
  }

  console.log(`[Guru] Собрано: ${results.length}`);
  return results;
}
