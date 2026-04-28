export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';


export const maxDuration = 60;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,*/*',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');

  if (source === 'freelanceru') {
    const res = await axios.get('https://freelance.ru/project/search?order=date&type=project', {
      headers: HEADERS, timeout: 15000,
    });
    const $ = cheerio.load(res.data);

    // Смотрим структуру project-item
    const items = [];
    $('[class*="project-item"]').each((i, el) => {
      if (i >= 5) return;
      const $el = $(el);
      const html = $el.html()?.slice(0, 800);
      const allLinks = [];
      $el.find('a').each((_, a) => allLinks.push({ href: $(a).attr('href'), text: $(a).text().trim().slice(0, 80) }));
      const text = $el.text().replace(/\s+/g, ' ').trim().slice(0, 200);
      items.push({ i, class: $el.attr('class'), html, allLinks, text });
    });

    return NextResponse.json({ total: $('[class*="project-item"]').length, items });
  }

  // YouDo — пробуем без редиректов с правильным payload
  if (source === 'youdo') {
    const payload = {
      q: '', list: 'all', status: 'opened',
      radius: 50, lat: 55.755864, lng: 37.617698,
      page: 1, noOffers: false, onlyB2B: false,
      onlySbr: false, onlyVacancies: false, onlyVirtual: false,
      priceMin: '', sortType: 1,
      sub: [149, 152, 150, 61, 151, 153, 155, 154, 158, 255, 101, 148, 146, 62, 63, 244, 245, 147, 246, 108],
    };

    try {
      const res = await axios.post('https://youdo.com/api/tasks/tasks/', payload, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://youdo.com/tasks-all-opened-all',
          'Origin': 'https://youdo.com',
          'x-featuresetid': '808',
        },
        timeout: 15000,
        maxRedirects: 0,
        validateStatus: s => s < 500,
      });
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      return NextResponse.json({
        status: res.status,
        isJson: typeof res.data === 'object',
        keys: typeof res.data === 'object' ? Object.keys(res.data) : [],
        body: body.slice(0, 1500),
      });
    } catch (e) {
      return NextResponse.json({ error: e.message, code: e.response?.status });
    }
  }

  return NextResponse.json({ routes: ['?source=freelanceru', '?source=youdo'] });
}
