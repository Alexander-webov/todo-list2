import axios from 'axios';
import { detectVacancyCategory } from '../../vacancyCategories.js';

const API_URL = 'https://remotive.com/api/remote-jobs';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export async function parseRemotive() {
  const results = [];

  try {
    const res = await axios.get(API_URL, {
      headers: HEADERS,
      timeout: 15000,
      params: { limit: 200 },
    });
    const jobs = res.data?.jobs || [];

    for (const v of jobs) {
      if (!v.id || !v.title) continue;

      const description = (v.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      const tags = Array.isArray(v.tags) ? v.tags : [];
      const text = `${v.title} ${v.category || ''} ${description} ${tags.join(' ')}`;

      const salaryMatch = (v.salary || '').match(/(\d[\d,.]*)\s*-?\s*(\d[\d,.]*)?/);
      const salaryMin = salaryMatch?.[1] ? Number(salaryMatch[1].replace(/[,.]/g, '')) : null;
      const salaryMax = salaryMatch?.[2] ? Number(salaryMatch[2].replace(/[,.]/g, '')) : null;

      results.push({
        external_id: String(v.id),
        source: 'remotive',
        region: 'world',
        title: v.title,
        company: v.company_name || null,
        description,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: 'USD',
        category: detectVacancyCategory(text),
        employment_type: v.job_type || null,
        tags: tags.slice(0, 10),
        url: v.url,
        published_at: v.publication_date ? new Date(v.publication_date).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Remotive] Ошибка:', err.message);
  }

  const filtered = results.filter(r => r.url);
  console.log(`[Remotive] Собрано: ${filtered.length}`);
  return filtered;
}
