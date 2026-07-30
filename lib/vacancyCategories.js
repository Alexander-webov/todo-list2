// lib/vacancyCategories.js — категории для раздела «Удалённая работа».
// Отдельная система от lib/parsers/categories.js: там — типы фриланс-заданий,
// здесь — направления вакансий на удалёнке (шире, включает "Без навыков").

export const VACANCY_CATEGORIES = [
  'Без навыков',
  'Дизайн',
  'FrontEnd',
  'BackEnd',
  'SMM',
  'Видеомонтаж',
  'Поддержка',
  'Маркетинг',
  'Менеджмент',
  'Другое',
];

export const VACANCY_CATEGORY_EMOJI = {
  'Без навыков': '🟢',
  'Дизайн': '🎨',
  'FrontEnd': '⚛️',
  'BackEnd': '⚙️',
  'SMM': '📱',
  'Видеомонтаж': '🎬',
  'Поддержка': '🎧',
  'Маркетинг': '📈',
  'Менеджмент': '🗂️',
  'Другое': '📌',
};

export const VACANCY_CATEGORY_SEO = {
  'bez-navykov': { name: 'Без навыков', dbCategory: 'Без навыков', emoji: '🟢', description: 'Удалённые вакансии без опыта и специальных навыков: оператор, ассистент, набор текста, модератор.' },
  'dizajn': { name: 'Дизайн', dbCategory: 'Дизайн', emoji: '🎨', description: 'Удалённые вакансии для дизайнеров: графический, веб, UI/UX.' },
  'frontend': { name: 'FrontEnd', dbCategory: 'FrontEnd', emoji: '⚛️', description: 'Удалённые вакансии FrontEnd-разработчиков: React, Vue, Next.js, TypeScript.' },
  'backend': { name: 'BackEnd', dbCategory: 'BackEnd', emoji: '⚙️', description: 'Удалённые вакансии BackEnd-разработчиков: Python, PHP, Node.js, Go.' },
  'smm': { name: 'SMM', dbCategory: 'SMM', emoji: '📱', description: 'Удалённые вакансии SMM-специалистов и таргетологов.' },
  'videomontazh': { name: 'Видеомонтаж', dbCategory: 'Видеомонтаж', emoji: '🎬', description: 'Удалённые вакансии видеомонтажёров и motion-дизайнеров.' },
  'podderzhka': { name: 'Поддержка', dbCategory: 'Поддержка', emoji: '🎧', description: 'Удалённые вакансии в поддержку и клиентский сервис.' },
  'marketing': { name: 'Маркетинг', dbCategory: 'Маркетинг', emoji: '📈', description: 'Удалённые вакансии в маркетинге и продажах.' },
  'menedzhment': { name: 'Менеджмент', dbCategory: 'Менеджмент', emoji: '🗂️', description: 'Удалённые вакансии менеджеров проектов и продукта.' },
};

/**
 * Определяет категорию вакансии по тексту (заголовок + описание/теги).
 * Порядок важен: специфичные категории проверяются раньше общих,
 * "Без навыков" проверяется первой, т.к. иначе слова вроде "менеджер"
 * в заголовке "менеджер без опыта" утянут её в "Менеджмент".
 */
export function detectVacancyCategory(text = '') {
  const t = text.toLowerCase();

  // 1. Без навыков / без опыта — самое специфичное сочетание
  if (/без\s*опыта|без\s*навыков|начинающ|стажёр|стажер|intern(ship)?|junior(?!.*(?:frontend|backend|developer|разработ))|entry[\-\s]?level|no\s*experience|набор\s*текста|оператор\s*(на\s*линии|call|колл)|курьер|расклейщик|модератор(?!.*контент.*стратег)|ассистент(?!.*продукт|.*проект)|подработка|удалённая\s*подработка|печатать\s*текст|заполнение\s*анкет|данные?\s*в\s*excel|data\s*entry/.test(t)) {
    return 'Без навыков';
  }

  // 2. Видеомонтаж
  if (/видеомонтаж|монтаж.*видео|premiere|davinci|after\s*effects|моушн|motion\s*design|видеограф|рилс|reels|video\s*edit/.test(t)) {
    return 'Видеомонтаж';
  }

  // 3. Дизайн
  if (/дизайн|design|figma|ui\/ux|\bui\b|\bux\b|логотип|logo|баннер|иллюстратор|illustrator|photoshop/.test(t)) {
    return 'Дизайн';
  }

  // 4. SMM
  if (/\bsmm\b|постинг|соцсет|таргет|smm[\-\s]?менеджер|контент[\-\s]?мейкер|инстаграм|telegram[\-\s]?канал/.test(t)) {
    return 'SMM';
  }

  // 5. FrontEnd
  if (/react|vue|angular|next\.?js|frontend|front[\-\s]?end|фронтенд|typescript|javascript[\-\s]?developer|верстальщик|html.*css/.test(t)) {
    return 'FrontEnd';
  }

  // 6. BackEnd
  if (/backend|back[\-\s]?end|бэкенд|бекенд|python[\-\s]?developer|php[\-\s]?developer|node\.?js|golang|django|laravel|devops|data\s*engineer|программист/.test(t)) {
    return 'BackEnd';
  }

  // 7. Поддержка
  if (/поддержк|саппорт|support\s*specialist|customer\s*support|customer\s*service|техподдержк|call[\-\s]?центр/.test(t)) {
    return 'Поддержка';
  }

  // 8. Маркетинг / продажи
  if (/маркетолог|marketing|продаж|sales|менеджер\s*по\s*продажам|lead\s*generation|email[\-\s]?маркетинг/.test(t)) {
    return 'Маркетинг';
  }

  // 9. Менеджмент
  if (/менеджер\s*проект|project\s*manager|product\s*manager|продакт[\-\s]?менеджер|scrum|руководитель\s*направлени/.test(t)) {
    return 'Менеджмент';
  }

  return 'Другое';
}

export function vacancyCategoryBySlug(slug) {
  return VACANCY_CATEGORY_SEO[slug] || null;
}
