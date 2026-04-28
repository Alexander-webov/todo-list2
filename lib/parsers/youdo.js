import https from 'https';
import zlib from 'zlib';
import { detectCategoryYoudo } from '../categories.js';

function httpsRequest(method, hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = {
      hostname, port: 443, path, method,
      headers: bodyStr
        ? { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
        : headers,
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        const setCookie = res.headers['set-cookie'] || [];
        const location = res.headers['location'] || '';
        const parse = b => {
          const text = b.toString('utf8');
          if (!text || text.trim() === 'blank' || text.trim() === '') return null;
          try { return JSON.parse(text); } catch { return null; }
        };
        if (enc === 'gzip') {
          zlib.gunzip(buf, (e, d) => e ? reject(e) : resolve({ status: res.statusCode, data: parse(d), setCookie, location }));
        } else if (enc === 'br') {
          zlib.brotliDecompress(buf, (e, d) => e ? reject(e) : resolve({ status: res.statusCode, data: parse(d), setCookie, location }));
        } else {
          resolve({ status: res.statusCode, data: parse(buf), setCookie, location });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export async function parseYoudo() {
  const results = [];
  const seen = new Set();
  const now = new Date().toISOString();
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 YaBrowser/26.3.0.0 Safari/537.36';

  try {
    const getRes = await httpsRequest('GET', 'youdo.com', '/tasks-all-opened-all', null, {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'ru,en;q=0.9',
      'User-Agent': UA,
    });

    const cookieStr = getRes.setCookie.map(c => c.split(';')[0]).join('; ');
    console.log(`[Youdo] GET: ${getRes.status}, куки: ${cookieStr.slice(0, 50)}...`);

    const POST_HEADERS = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'ru,en;q=0.9',
      'Content-Type': 'application/json',
      'Cookie': cookieStr,
      'Origin': 'https://youdo.com',
      'Referer': 'https://youdo.com/tasks-all-opened-all',
      'User-Agent': UA,
      'x-requested-with': 'XMLHttpRequest',
      'x-featuresetid': '788',
    };

    const BODY = {
      q: '', list: 'all', status: 'opened',
      radius: 50, lat: 55.755864, lng: 37.617698,
      page: 1, noOffers: false, onlyB2B: false,
      onlySbr: false, onlyVacancies: false, onlyVirtual: true,
      priceMin: '', sortType: 1,
      sub: [149,152,150,61,151,153,155,154,158,255,101,148,146,62,63,244,245,147,246,108],
    };

    const post1 = await httpsRequest('POST', 'youdo.com', '/api/tasks/tasks/', BODY, POST_HEADERS);
    console.log(`[Youdo] POST1: ${post1.status}`);

    let parsed = post1.data;

    if (!parsed && post1.status === 307 && post1.location) {
      const url = new URL(post1.location);
      const allCookies = cookieStr + (post1.setCookie.length
        ? '; ' + post1.setCookie.map(c => c.split(';')[0]).join('; ')
        : '');
      const post2 = await httpsRequest('POST', url.hostname, url.pathname, BODY, {
        ...POST_HEADERS,
        'Cookie': allCookies,
      });
      console.log(`[Youdo] POST2: ${post2.status}`);
      parsed = post2.data;
    }

    if (!parsed) {
      console.error('[Youdo] Нет данных — возможно блокировка по IP');
      return [];
    }

    const tasks = parsed?.ResultObject?.Items || parsed?.tasks || [];
    console.log(`[Youdo] Заданий: ${tasks.length}`);

    for (const t of tasks) {
      const id = t.Id || t.id;
      if (!id || seen.has(String(id))) continue;
      seen.add(String(id));

      let budget = t.PriceAmount > 0 ? t.PriceAmount : null;
      if (!budget && t.BudgetDescription) {
        const match = t.BudgetDescription.replace(/\s/g, '').match(/\d+/);
        if (match) budget = parseInt(match[0]);
      }

      const creatorId = t.CreatorInfo?.Id || null;

      results.push({
        external_id: String(id),
        source: 'youdo',
        title: (t.Name || '').trim(),
        description: (t.Description || '').slice(0, 500),
        budget_min: budget,
        budget_max: null,
        currency: 'RUB',
        category: detectCategoryYoudo(
          t.CategoryFlag || '',
          (t.Name || '') + ' ' + (t.Description || '')
        ),
        tags: [],
        url: t.Url ? 'https://youdo.com' + t.Url : `https://youdo.com/t${id}`,
        referral_url: t.Url ? 'https://youdo.com' + t.Url : `https://youdo.com/t${id}`,
        published_at: now,
        customer_external_id: creatorId ? String(creatorId) : null,
        customer_source: 'youdo',
      });
    }

  } catch(err) {
    console.error('[Youdo] Ошибка:', err.message);
  }

  console.log(`[Youdo] Итого: ${results.length}`);
  return results;
}


