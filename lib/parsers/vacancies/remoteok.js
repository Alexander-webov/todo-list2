import axios from 'axios';
import { detectVacancyCategory } from '../../vacancyCategories.js';

const API_URL = 'https://remoteok.com/api';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export async function parseRemoteOK() {
  const results = [];

  try {
    const res = await axios.get(API_URL, { headers: HEADERS, timeout: 15000 });
    const items = Array.isArray(res.data) ? res.data : [];

    for (const v of items) {
      // Первый элемент массива у RemoteOK — служебный legal-объект без id вакансии.
      if (!v.id || !v.position) continue;

      const tags = Array.isArray(v.tags) ? v.tags : [];
      const text = `${v.position} ${v.description || ''} ${tags.join(' ')}`;

      results.push({
        external_id: String(v.id),
        source: 'remoteok',
        region: 'world',
        title: v.position,
        company: v.company || null,
        description: (v.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
        salary_min: v.salary_min || null,
        salary_max: v.salary_max || null,
        currency: 'USD',
        category: detectVacancyCategory(text),
        employment_type: null,
        tags: tags.slice(0, 10),
        url: v.url || (v.slug ? `https://remoteok.com/remote-jobs/${v.slug}` : null),
        published_at: v.date ? new Date(v.date).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[RemoteOK] Ошибка:', err.message);
  }

  const filtered = results.filter(r => r.url);
  console.log(`[RemoteOK] Собрано: ${filtered.length}`);
  return filtered;
}
