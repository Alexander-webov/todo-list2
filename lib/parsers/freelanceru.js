import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory } from '../categories.js';

// ВНИМАНИЕ: в 2025–2026 freelance.ru сменил структуру.
//   Было:  /project/search?type=project  +  карточки .project-item-default-card
//          ссылки вида /projects/slug-1663953.html
//   Стало: /task  (раздел «Задания»), карточки без стабильного класса,
//          ссылки вида /task/view/2538
// Поэтому парсим устойчиво: ищем ВСЕ ссылки /task/view/{id} и поднимаемся
// к их карточке, а поля достаём по тексту (бюджет/дата/премиум), а не по классам —
// так парсер не сломается при следующем рестайлинге.

const BASE = 'https://freelance.ru';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  'Referer': BASE,
};

// Категории из фильтров ленты — для определения категории по тексту карточки
const SITE_CATEGORIES = [
  '3D графика', 'Арт и Иллюстрации', 'Аутсорсинг и Консалтинг',
  'Веб-разработка и Продуктовый дизайн', 'Графический дизайн',
  'Дизайн пространства', 'Инженерия', 'Интернет продвижение',
  'Искусственный интеллект', 'ИТ и Разработка', 'Маркетинг и Реклама',
  'Медиа и Моушен дизайн', 'Музыка и Звук', 'Обучение и Образование',
  'Переводы', 'Тексты', 'Фотография',
];

async function fetchPage(page) {
  const url = `${BASE}/task?page=${page}`;
  const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
  return res.data;
}

// Поднимаемся от ссылки на задание к её карточке: первый предок,
// в тексте которого есть маркеры карточки (бюджет/дата/гонорар).
function findCard($, $a) {
  let $card = $a;
  for (let i = 0; i < 7; i++) {
    const $p = $card.parent();
    if (!$p.length || $p.is('body') || $p.is('html')) break;
    $card = $p;
    const t = $card.text();
    if (/назад|₽|Гонорар|Обсуждается|Срок:/.test(t)) break;
  }
  return $card;
}

// "2 дня назад", "20 часов назад", "час назад", "день назад", "2 минуты назад",
// "вчера", "3 недели назад", "месяц назад" → ISO
function parseRelativeDate(text) {
  const now = Date.now();
  const t = (text || '').toLowerCase();

  if (/только что|сейчас/.test(t)) return new Date(now).toISOString();
  if (/позавчера/.test(t)) return new Date(now - 2 * 864e5).toISOString();
  if (/вчера/.test(t)) return new Date(now - 864e5).toISOString();

  const m = t.match(/(\d+)\s*(секунд|минут|час|дн|день|недел|месяц|год|лет)/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    let ms = 0;
    if (unit.startsWith('секунд')) ms = n * 1000;
    else if (unit.startsWith('минут')) ms = n * 60000;
    else if (unit.startsWith('час')) ms = n * 3600000;
    else if (unit.startsWith('дн') || unit.startsWith('день')) ms = n * 864e5;
    else if (unit.startsWith('недел')) ms = n * 7 * 864e5;
    else if (unit.startsWith('месяц')) ms = n * 30 * 864e5;
    else if (unit.startsWith('год') || unit.startsWith('лет')) ms = n * 365 * 864e5;
    return new Date(now - ms).toISOString();
  }

  // без числа = 1
  if (/час назад/.test(t)) return new Date(now - 3600000).toISOString();
  if (/день назад/.test(t)) return new Date(now - 864e5).toISOString();
  if (/минут[уы]? назад/.test(t)) return new Date(now - 60000).toISOString();

  return new Date(now).toISOString();
}

function detectSiteCategory(text) {
  for (const c of SITE_CATEGORIES) {
    if (text.includes(c)) return c;
  }
  return '';
}

function parseTasks(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seenIds = new Set();

  $('a[href*="/task/view/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const idMatch = href.match(/\/task\/view\/(\d+)/);
    if (!idMatch) return;
    const externalId = idMatch[1];
    if (seenIds.has(externalId)) return; // одна карточка = несколько ссылок, берём раз
    seenIds.add(externalId);

    const url = href.startsWith('http') ? href : `${BASE}${href}`;
    const title = ($a.attr('title') || $a.text() || '').trim();
    if (!title) return;

    const $card = findCard($, $a);
    const cardText = $card.text().replace(/\s+/g, ' ').trim();

    // Премиум-задание (доступно только по подписке на самом freelance.ru)
    const premiumOnly = /Только для Премиум/i.test(cardText);

    // Бюджет: "25 000 ₽" / "900 ₽". "Обсуждается индивидуально" → null
    let budget = null;
    if (!/Обсуждается/i.test(cardText)) {
      const bMatch = cardText.match(/(\d[\d\s]*)\s*₽/);
      if (bMatch) {
        const num = parseFloat(bMatch[1].replace(/\s/g, ''));
        if (!isNaN(num) && num > 0) budget = num;
      }
    }

    const siteCategory = detectSiteCategory(cardText);

    // Описание: текст карточки без заголовка и служебных хвостов, до 400 символов
    let description = cardText
      .replace(title, ' ')
      .replace(/Видно всем|★\s*Только для Премиум|Гонорар.*$/i, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400);

    const publishedAt = parseRelativeDate(cardText);

    results.push({
      external_id: String(externalId),
      source: 'freelanceru',
      title: title.slice(0, 300),
      description,
      budget_min: budget,
      budget_max: null,
      currency: 'RUB',
      category: detectCategory(
        (siteCategory ? siteCategory + ' ' : '') + title + ' ' + description
      ),
      tags: siteCategory ? [siteCategory] : [],
      url,
      referral_url: url,
      published_at: publishedAt,
    });
  });

  return results;
}

export async function parseFreelanceRu() {
  const results = [];
  const seen = new Set();

  for (let page = 1; page <= 5; page++) {
    try {
      const html = await fetchPage(page);
      const items = parseTasks(html);

      if (items.length === 0) {
        console.log(`[Freelance.ru] Страница ${page} пустая — стоп`);
        break;
      }

      let added = 0;
      for (const p of items) {
        if (!seen.has(p.external_id)) {
          seen.add(p.external_id);
          results.push(p);
          added++;
        }
      }

      console.log(`[Freelance.ru] Страница ${page}: ${items.length} заданий (+${added} новых)`);

      // Если страница не добавила ничего нового — пагинация по ?page не сработала, стоп
      if (added === 0) {
        console.log('[Freelance.ru] Новых заданий нет — вероятно, пагинация не сработала, стоп');
        break;
      }

      await new Promise((r) => setTimeout(r, 700));
    } catch (err) {
      console.error(`[Freelance.ru] Ошибка страницы ${page}:`, err.message);
      break;
    }
  }

  console.log(`[Freelance.ru] Итого: ${results.length}`);
  return results;
}
