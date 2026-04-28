import https from 'https';
import zlib from 'zlib';
import { detectCategory } from '../categories.js';

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
          try { return JSON.parse(b.toString('utf8')); } catch { return null; }
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

export async function parseWorkzilla() {
  const results = [];
  const seen = new Set();

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 YaBrowser/26.3.0.0 Safari/537.36';

  try {
    let cookieStr = process.env.WORKZILLA_COOKIE || '';

    if (!cookieStr) {
      let getRes = await httpsRequest('GET', 'client.work-zilla.com', '/freelancer', null, {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'ru,en;q=0.9',
        'User-Agent': UA,
      });

      let allCookies = getRes.setCookie.map(c => c.split(';')[0]);
      if ((getRes.status === 302 || getRes.status === 301) && getRes.location) {
        const url = new URL(getRes.location, 'https://client.work-zilla.com');
        const getRes2 = await httpsRequest('GET', url.hostname, url.pathname + (url.search || ''), null, {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'ru,en;q=0.9',
          'User-Agent': UA,
          'Cookie': allCookies.join('; '),
        });
        allCookies = [...allCookies, ...getRes2.setCookie.map(c => c.split(';')[0])];
      }
      cookieStr = [...new Set(allCookies)].join('; ');
    }

    console.log(`[Workzilla] куки: ${cookieStr.slice(0, 50)}...`);

    const HEADERS = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'ru,en;q=0.9',
      'Cookie': cookieStr,
      'Referer': 'https://client.work-zilla.com/freelancer',
      'User-Agent': UA,
      'agentid': process.env.WORKZILLA_AGENTID || 'fp21-80a15a2039080e8f0283a9b4fb6c8d09',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };

    const endpoints = [
      '/api/order/v6/list/open?hideInsolvoOrders=false&sort=new',
      '/api/order/v6/list/open?hideInsolvoOrders=false&sort=new&page=2',
      '/api/order/v6/list/open?hideInsolvoOrders=false&sort=new&page=3',
      '/api/order/v6/list/open?hideInsolvoOrders=false',
    ];

    const orders = [];
    for (const endpoint of endpoints) {
      const apiRes = await httpsRequest('GET', 'client.work-zilla.com', endpoint, null, HEADERS);
      if (apiRes.data?.result === 102) {
        console.error('[Workzilla] result: 102 — сессия не принята');
        return [];
      }
      const pageOrders = [
        ...(apiRes.data?.data?.interesting || []),
        ...(apiRes.data?.data?.other || []),
        ...(apiRes.data?.data?.new || []),
        ...(Array.isArray(apiRes.data?.data) ? apiRes.data.data : []),
      ];
      orders.push(...pageOrders);
      if (pageOrders.length === 0) break;
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[Workzilla] Заданий: ${orders.length}`);

    for (const order of orders) {
      if (!order.id || !order.subject || seen.has(order.id)) continue;
      seen.add(order.id);

      // Используем текущее время — чтобы новые заказы всегда были наверху ленты
      const publishedAt = new Date().toISOString();

      results.push({
        external_id: String(order.id),
        source: 'workzilla',
        title: order.subject.trim(),
        description: (order.description || '').slice(0, 500),
        budget_min: order.price || null,
        budget_max: null,
        currency: 'RUB',
        category: detectCategory(order.subject + ' ' + (order.description || '')),
        tags: [],
        url: `https://work-zilla.com/tasks/${order.id}`,
        referral_url: `https://work-zilla.com/tasks/${order.id}`,
        published_at: publishedAt,
        customer_external_id: order.customerId ? String(order.customerId) : null,
        customer_source: 'workzilla',
      });
    }

  } catch(err) {
    console.error('[Workzilla] Ошибка:', err.message);
  }

  console.log(`[Workzilla] Итого: ${results.length}`);
  return results;
}


