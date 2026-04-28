// lib/roles.js — 5 ролей пользователя + маппинг на текущие 10 категорий БД
// В БД проекты продолжают храниться с детальной категоризацией (Web дизайн,
// FrontEnd и т.д.) — это нужно для точного SEO и парсинга. А пользователю
// показываем укрупнённые роли.

export const ROLES = [
  { key: 'designer',   label: 'Дизайнер',         emoji: '🎨' },
  { key: 'videomaker', label: 'Видеомонтажёр',    emoji: '🎬' },
  { key: 'developer',  label: 'Разработчик',      emoji: '💻' },
  { key: 'smm',        label: 'SMM-специалист',   emoji: '📱' },
  { key: 'other',      label: 'Другое',           emoji: '📌' },
];

export const ROLE_META = Object.fromEntries(ROLES.map(r => [r.key, r]));

// Одна роль → несколько категорий БД
export const ROLE_TO_CATEGORIES = {
  designer:   ['Графический дизайн', 'Web дизайн'],
  videomaker: ['Видеомонтаж'],
  developer:  ['FrontEnd', 'BackEnd', 'Вёрстка', 'WordPress / Tilda / CMS', 'Парсинг'],
  smm:        ['SMM'],
  other:      ['Другое'],
};

// Обратный маппинг: категория → роль (для фильтрации и подсказок)
export const CATEGORY_TO_ROLE = {};
for (const [role, cats] of Object.entries(ROLE_TO_CATEGORIES)) {
  for (const cat of cats) CATEGORY_TO_ROLE[cat] = role;
}

export function roleLabel(key) {
  return ROLE_META[key]?.label || 'Другое';
}

export function roleEmoji(key) {
  return ROLE_META[key]?.emoji || '📌';
}

export function isValidRole(key) {
  return !!ROLE_META[key];
}

// Список категорий для фильтра проектов по роли (используется на фронте)
export function categoriesForRole(roleKey) {
  return ROLE_TO_CATEGORIES[roleKey] || [];
}

// ─── SEO-данные для ролевых лендингов (/for/[role]) ───

export const ROLE_SEO = {
  designer: {
    key: 'designer',
    label: 'Дизайнер',
    emoji: '🎨',
    h1: 'Заказы для дизайнеров',
    metaTitle: 'Заказы для дизайнеров — фриланс работа | FreelanceHere',
    metaDescription: 'Актуальные фриланс-заказы для дизайнеров: графический дизайн, web-дизайн, логотипы, карточки маркетплейсов, баннеры, UI/UX. Обновляется каждую минуту. Бесплатно.',
    keywords: 'заказы для дизайнера, фриланс дизайн, графический дизайн работа, веб дизайн заказы, UI UX удалённо, логотип заказ, карточки WB Ozon, баннер дизайнер',
    heroText: 'Собираем заказы по графическому и веб-дизайну с 8 бирж. Логотипы, карточки маркетплейсов, баннеры, UI/UX, оформление соцсетей — всё в одной ленте.',
    perks: [
      { emoji: '🎨', title: 'Графический + Web', desc: 'Обе категории в одной ленте — логотипы, баннеры, UI/UX, лендинги' },
      { emoji: '⚡', title: 'Обновление каждую минуту', desc: 'Новые заказы появляются раньше чем на самих биржах' },
      { emoji: '🤖', title: 'AI-отклик в 1 клик', desc: 'Сгенерируем текст отклика специально под клиента' },
      { emoji: '📊', title: '% совпадения', desc: 'Покажем насколько заказ подходит твоим навыкам и ставке' },
    ],
  },
  videomaker: {
    key: 'videomaker',
    label: 'Видеомонтажёр',
    emoji: '🎬',
    h1: 'Заказы для видеомонтажёров',
    metaTitle: 'Заказы по видеомонтажу — фриланс работа | FreelanceHere',
    metaDescription: 'Фриланс-заказы по видеомонтажу: Premiere Pro, DaVinci, After Effects, Reels, motion-design, обработка видео. Собираем с FL.ru, Kwork, Youdo и других бирж.',
    keywords: 'видеомонтаж заказы, фриланс видеомонтажёр, premiere pro удалённо, after effects заказ, монтаж reels, монтаж видео, motion design работа',
    heroText: 'Все заказы по монтажу и обработке видео в одной ленте: ролики для YouTube и соцсетей, Reels, моушн-графика, цветокор, обработка.',
    perks: [
      { emoji: '🎬', title: 'Все типы монтажа', desc: 'Premiere, DaVinci, After Effects, Reels, motion-design — всё в одной ленте' },
      { emoji: '🔥', title: 'Фильтр по бюджету', desc: 'Сразу видишь жирные заказы — от 10 000 ₽ и выше' },
      { emoji: '🤖', title: 'AI-отклик с учётом ТЗ', desc: 'Читает задачу и пишет отклик от первого лица, а не шаблон' },
      { emoji: '💬', title: 'Telegram-канал', desc: 'Лучшие заказы приходят в Telegram — отклик до конкурентов' },
    ],
  },
  developer: {
    key: 'developer',
    label: 'Разработчик',
    emoji: '💻',
    h1: 'Заказы для разработчиков',
    metaTitle: 'Заказы для разработчиков — фриланс работа | FreelanceHere',
    metaDescription: 'Фриланс-заказы для разработчиков: FrontEnd (React, Vue, Next.js), BackEnd (Python, Node, PHP), вёрстка, WordPress/Tilda/CMS, парсинг и боты. 8 бирж в одной ленте.',
    keywords: 'заказы для программиста, фриланс разработчик, React заказы, Python фриланс, верстка удалённо, WordPress разработка, telegram бот заказ, парсинг данных',
    heroText: 'FrontEnd, BackEnd, вёрстка, CMS, парсинг, Telegram-боты — все айтишные заказы с 8 бирж в одной ленте. Новое появляется за секунды.',
    perks: [
      { emoji: '⚛️', title: 'Весь стек', desc: 'React, Vue, Python, Node, PHP, Laravel, WordPress, боты — в одной ленте' },
      { emoji: '⚡', title: 'Реал-тайм лента', desc: 'Заказ появляется на сайте раньше чем ты успеешь открыть FL.ru' },
      { emoji: '🌍', title: 'RU + международные', desc: 'FL, Kwork, Youdo, Freelancer.com, PeoplePerHour, Guru — одним кликом' },
      { emoji: '🤖', title: 'AI-отклик под ТЗ', desc: 'Генерируем технический отклик со ссылками на релевантные кейсы' },
    ],
  },
  smm: {
    key: 'smm',
    label: 'SMM-специалист',
    emoji: '📱',
    h1: 'Заказы для SMM-специалистов',
    metaTitle: 'Заказы по SMM — фриланс работа | FreelanceHere',
    metaDescription: 'Фриланс-заказы по SMM: ведение соцсетей, контент-план, постинг, оформление, таргет. Актуальные проекты с бирж FL.ru, Kwork, Youdo.',
    keywords: 'SMM заказы, ведение соцсетей фриланс, контент план удалённо, оформление инстаграм, таргетолог работа, SMM специалист заказ',
    heroText: 'Ведение соцсетей, контент-планы, постинг, таргетированная реклама — все SMM-заказы с 8 бирж в одной ленте.',
    perks: [
      { emoji: '📱', title: 'Все направления SMM', desc: 'Ведение, контент, таргет, оформление, стратегия — в одной ленте' },
      { emoji: '💰', title: 'Фильтр по бюджету', desc: 'Видишь только заказы от 5 000 ₽ — остальное скрыто' },
      { emoji: '🎯', title: '% совпадения', desc: 'Указываешь ниши (beauty, ecom, edtech) — считаем релевантность' },
      { emoji: '🤖', title: 'AI-отклик', desc: 'Пишем отклик с учётом специфики проекта и твоего опыта' },
    ],
  },
  other: {
    key: 'other',
    label: 'Другое',
    emoji: '📌',
    h1: 'Фриланс-заказы других направлений',
    metaTitle: 'Фриланс-заказы — копирайтинг, переводы, консультации | FreelanceHere',
    metaDescription: 'Фриланс-заказы которые не подошли в основные категории: копирайтинг, переводы, консультации, аналитика, маркетинг.',
    keywords: 'фриланс заказы, копирайтинг удалённо, переводы фриланс, консультации онлайн',
    heroText: 'Всё, что не попало в основные категории: копирайтинг, переводы, консультации, аналитика.',
    perks: [
      { emoji: '📝', title: 'Разные направления', desc: 'Тексты, переводы, консультации, исследования' },
      { emoji: '🔎', title: 'Поиск по ключевым словам', desc: 'Настраивай фильтры под свою нишу в настройках профиля' },
      { emoji: '⚡', title: 'Обновление в реал-тайм', desc: 'Заказы появляются сразу после публикации на биржах' },
      { emoji: '🤖', title: 'AI-отклик', desc: 'Генерируем тексты откликов под любую нишу' },
    ],
  },
};

export function roleSeoBySlug(slug) {
  return ROLE_SEO[slug] || null;
}
