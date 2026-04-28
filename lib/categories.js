// lib/categories.js — единая система категорий проекта

export const CATEGORIES = [
  'WordPress / Tilda / CMS',
  'Видеомонтаж',
  'Графический дизайн',
  'Web дизайн',
  'SMM',
  'Парсинг',
  'Вёрстка',
  'FrontEnd',
  'BackEnd',
  'Другое',
];

export const CATEGORY_EMOJI = {
  'WordPress / Tilda / CMS': '🔧',
  'Видеомонтаж': '🎬',
  'Графический дизайн': '🎨',
  'Web дизайн': '🖥️',
  'SMM': '📱',
  'Парсинг': '🤖',
  'Вёрстка': '📄',
  'FrontEnd': '⚛️',
  'BackEnd': '⚙️',
  'Другое': '📌',
};

// SEO-данные для страниц категорий
export const CATEGORY_SEO = {
  'wordpress-tilda-cms': {
    name: 'WordPress / Tilda / CMS',
    dbCategory: 'WordPress / Tilda / CMS',
    emoji: '🔧',
    description: 'Заказы на создание и доработку сайтов на WordPress, Tilda, Bitrix, Joomla и других CMS и конструкторах. Настройка, установка плагинов, дизайн и разработка.',
    keywords: 'wordpress фриланс, tilda заказы, CMS разработка, конструктор сайтов, битрикс удалённо',
  },
  'videomontazh': {
    name: 'Видеомонтаж',
    dbCategory: 'Видеомонтаж',
    emoji: '🎬',
    description: 'Заказы на видеомонтаж, обработку видео, создание роликов, motion design. Актуальные проекты для видеографов и монтажёров.',
    keywords: 'видеомонтаж фриланс, монтаж видео заказы, premiere pro удалённо, after effects',
  },
  'graficheskij-dizajn': {
    name: 'Графический дизайн',
    dbCategory: 'Графический дизайн',
    emoji: '🎨',
    description: 'Заказы на дизайн карточек, баннеров, логотипов, соцсетей, полиграфии. Все проекты для графических дизайнеров.',
    keywords: 'графический дизайн фриланс, баннер заказы, логотип удалённо, карточки маркетплейс',
  },
  'web-dizajn': {
    name: 'Web дизайн',
    dbCategory: 'Web дизайн',
    emoji: '🖥️',
    description: 'Заказы на веб-дизайн сайтов, лендингов, интернет-магазинов, UI/UX. Проекты для веб-дизайнеров.',
    keywords: 'веб дизайн фриланс, дизайн сайта заказы, лендинг дизайн, UI UX удалённо',
  },
  'smm': {
    name: 'SMM',
    dbCategory: 'SMM',
    emoji: '📱',
    description: 'Заказы на SMM: ведение соцсетей, оформление, постинг, контент-план. Проекты для SMM-менеджеров.',
    keywords: 'SMM фриланс, ведение соцсетей заказы, постинг удалённо, оформление инстаграм',
  },
  'parsing': {
    name: 'Парсинг',
    dbCategory: 'Парсинг',
    emoji: '🤖',
    description: 'Заказы на парсинг данных, разработку ботов, скрипты автоматизации, сбор информации. Проекты для разработчиков.',
    keywords: 'парсинг фриланс, бот заказы, скрипт автоматизация, сбор данных удалённо',
  },
  'verstka': {
    name: 'Вёрстка',
    dbCategory: 'Вёрстка',
    emoji: '📄',
    description: 'Заказы на вёрстку сайтов: HTML, CSS, адаптивная и кроссбраузерная вёрстка, натяжка на CMS.',
    keywords: 'вёрстка сайтов фриланс, HTML CSS заказы, адаптивная верстка удалённо',
  },
  'frontend': {
    name: 'FrontEnd',
    dbCategory: 'FrontEnd',
    emoji: '⚛️',
    description: 'Заказы на FrontEnd-разработку: React, Vue, Angular, Next.js, TypeScript. Проекты для фронтенд-разработчиков.',
    keywords: 'frontend фриланс, React заказы, Vue Angular удалённо, JavaScript разработка',
  },
  'backend': {
    name: 'BackEnd',
    dbCategory: 'BackEnd',
    emoji: '⚙️',
    description: 'Заказы на BackEnd-разработку: PHP, Python, Node.js, API, базы данных, серверы, CMS-системы.',
    keywords: 'backend фриланс, PHP Python заказы, API разработка, серверная часть удалённо',
  },
};

/**
 * Определяет категорию проекта по тексту (заголовок + описание).
 * Порядок проверок важен: более специфичные категории идут первыми.
 */
export function detectCategory(text = '') {
  const t = text.toLowerCase();

  // 1. Видеомонтаж (очень специфичный — проверяем первым)
  if (/видеомонтаж|монтаж.*видео|видео.*монтаж|видеоролик|premiere|davinci|after\s*effects|моушн|motion\s*design|видеограф|видеоредакт|анимаци.*ролик|рилс|reels|монтаж.*ролик|video\s*edit|видео.*обработ/.test(t)) {
    return 'Видеомонтаж';
  }

  // 2. Графический дизайн — ВЫСОКИЙ приоритет (логотипы, карточки, баннеры — очень специфичные)
  if (/логотип|logo|баннер|banner|карточк.*товар|карточк.*маркетплейс|карточк.*wildberries|карточк.*ozon|карточк.*wb|инфографик|иллюстра|illustrat|полиграф|фирменный.*стиль|брендинг|brand.*design|визитк|business\s*card|буклет|brochure|листовк|флаер|flyer|этикетк|label.*design|упаковк|packag|афиш|плакат|poster|обложк|cover.*design|макет.*печат|фотошоп|photoshop|coreldraw|corel|illustrator|мокап|mockup|стикер|принт|ретушь|retou?ch|фотообработ|photo.*edit|коллаж/.test(t)) {
    return 'Графический дизайн';
  }

  // 3. SMM (специфичный)
  if (/\bsmm\b|постинг|оформлен.*соц|ведени.*соц|ведение.*инст|ведение.*групп|контент.*план|соцсет|продвижен.*соц|сториз|stories|таргет.*реклам|таргетолог|ведение.*аккаунт|ведение.*паблик|контент.*менеджер/.test(t)) {
    return 'SMM';
  }

  // 4. Парсинг / боты / скрипты (специфичный)
  if (/парсинг|парсер|сбор.*данн|web.*scrap|scraping|selenium|beautifulsoup|telegram.*бот|чат.*бот|бот.*telegram|скрипт.*автоматиз|автоматизац.*скрипт|бот.*для|разработ.*бот|api.*интеграц/.test(t)) {
    return 'Парсинг';
  }

  // 5. WordPress / Tilda / CMS (конструкторы и CMS)
  if (/wordpress|тильда|tilda|wix|bitrix|битрикс|joomla|opencart|modx|drupal|hostcms|squarespace|webflow|shopify|1с-битрикс|1c-bitrix|установк.*сайт|настройк.*wordpress|плагин.*wordpress|тема.*wordpress|шаблон.*сайт|конструктор.*сайт|cms|движок.*сайт/.test(t)) {
    return 'WordPress / Tilda / CMS';
  }

  // 6. Web дизайн (до общего дизайна, т.к. пересекается)
  if (/веб.*дизайн|web.*дизайн|дизайн.*сайт|дизайн.*лендинг|дизайн.*магазин|дизайн.*приложен|дизайн.*интерфейс|прототип.*сайт|\bui\b|\bux\b|ui\/ux|figma.*сайт|figma.*лендинг|figma.*интерфейс|макет.*сайт|wireframe|landing.*page.*design/.test(t)) {
    return 'Web дизайн';
  }

  // 7. Общий «дизайн» без конкретики — Графический дизайн (fallback)
  if (/дизайн|design|карточк|презентац|graphic|creative.*design|figma|canva/.test(t)) {
    return 'Графический дизайн';
  }

  // 8. FrontEnd (фреймворки и JS — до вёрстки)
  if (/react|vue|angular|next\.?js|nuxt|typescript|frontend|front[\-\s]?end|фронтенд|svelte|gatsby|remix|webpack|vite|tailwind|redux|javascript.*разработ|js.*разработ|spa|pwa/.test(t)) {
    return 'FrontEnd';
  }

  // 9. Вёрстка (чистая HTML/CSS вёрстка)
  if (/вёрстк|верстк|html|css|адаптивн.*макет|кроссбраузер|pixel.*perfect|натяжк|psd.*to|макет.*верст|респонсив|adaptive/.test(t)) {
    return 'Вёрстка';
  }

  // 10. BackEnd (серверная разработка + CMS-системы)
  if (/backend|back[\-\s]?end|бэкенд|бекенд|php(?!otoshop)|python|node\.?js|django|laravel|api.*разработ|разработ.*api|сервер.*разработ|база.*данных|sql|postgresql|mysql|mongodb|docker|devops|1с(?!.*битрикс)|yii|symfony|fastapi|express\.?js|golang|ruby|\.net/.test(t)) {
    return 'BackEnd';
  }

  return 'Другое';
}

/**
 * Определяет категорию для YouDo (с учётом флага категории).
 */
export function detectCategoryYoudo(flag = '', text = '') {
  // Сначала проверяем по тексту (более точно)
  const byText = detectCategory(text);
  if (byText !== 'Другое') return byText;

  // Фоллбэк по флагу YouDo
  const flagMap = {
    'webdevelopment': 'FrontEnd',
    'design': 'Графический дизайн',
    'mobile': 'Другое',
  };
  return flagMap[flag] || 'Другое';
}
