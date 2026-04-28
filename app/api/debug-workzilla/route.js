import { NextResponse } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';

export async function GET(request) {
  /*   const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } */

  const cookie = process.env.WORKZILLA_COOKIE;
  if (!cookie) return NextResponse.json({ error: 'WORKZILLA_COOKIE не задан' });

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, */*',
    'Accept-Language': 'ru,en;q=0.9',
    'Cookie': cookie,
    'Referer': 'https://client.work-zilla.com/freelancer',
  };

  const results = {};
  const urls = [
    'https://client.work-zilla.com/api/order/v6/list/open?hideInsolvoOrders=false',
    'https://client.work-zilla.com/api/order/v6/list/open?hideInsolvoOrders=false&sort=new',
    'https://client.work-zilla.com/api/order/v6/list/new',
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const data = res.data;
      const orders = [
        ...(data?.data?.interesting || []),
        ...(data?.data?.other || []),
        ...(data?.data?.new || []),
        ...(Array.isArray(data?.data) ? data.data : []),
      ];
      results[url] = {
        status: res.status,
        totalOrders: orders.length,
        dataKeys: data?.data ? Object.keys(data.data) : [],
        firstOrder: orders[0] ? {
          id: orders[0].id,
          subject: orders[0].subject,
          price: orders[0].price,
          modified: orders[0].modified,
        } : null,
        rawPreview: JSON.stringify(data).slice(0, 400),
      };
    } catch (e) {
      results[url] = {
        error: e.message,
        status: e.response?.status,
        body: JSON.stringify(e.response?.data || '').slice(0, 200),
      };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return NextResponse.json(results);
}
