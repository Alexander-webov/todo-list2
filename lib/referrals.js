/**
 * Партнёрские/реферальные ссылки на биржи.
 * Замени на свои реферальные токены после регистрации партнёром.
 *
 * Как получить:
 * - Kwork:       https://kwork.ru/affiliate
 * - FL.ru:       https://www.fl.ru/pages/referral/
 * - Freelancer:  https://www.freelancer.com/affiliate/
 */

const REFERRAL_TOKENS = {
  kwork: "876807" || '',
  fl: process.env.FL_REFERRAL || '',
  freelancer: process.env.FREELANCER_REFERRAL || '',
  freelanceru: process.env.FREELANCERU_REFERRAL || '',
};

/**
 * Строит реферальную ссылку для проекта.
 * Если токен не задан — возвращает оригинальный URL.
 */
export function buildReferralUrl(source, originalUrl) {
  const token = REFERRAL_TOKENS[source];
  if (!token) return originalUrl;

  switch (source) {
    case 'kwork':
      // Kwork: добавляем ?ref=TOKEN
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}ref=${token}`;

    case 'fl':
      // FL.ru: добавляем ?ref=TOKEN
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}ref=${token}`;

    case 'freelancer':
      // Freelancer.com: добавляем ?ref=TOKEN
      return `${originalUrl}${originalUrl.includes('?') ? '&' : '?'}reference=${token}`;

    default:
      return originalUrl;
  }
}

/**
 * Ссылки на регистрацию на биржах (для страницы партнёрства)
 */
export const PARTNER_LINKS = {
  // Российские биржи
  kwork: {
    name: 'Kwork',
    color: '#ff4d00',
    registerUrl: REFERRAL_TOKENS.kwork
      ? `https://kwork.ru/?ref=${REFERRAL_TOKENS.kwork}`
      : 'https://kwork.ru',
    affiliateUrl: 'https://kwork.ru/affiliate',
    description: 'Крупнейшая русскоязычная биржа заданий',
  },
  fl: {
    name: 'FL.ru',
    color: '#ff6600',
    registerUrl: REFERRAL_TOKENS.fl
      ? `https://www.fl.ru/?ref=${REFERRAL_TOKENS.fl}`
      : 'https://www.fl.ru',
    affiliateUrl: 'https://www.fl.ru/pages/referral/',
    description: 'Старейшая фриланс-биржа России',
  },
  freelanceru: {
    name: 'Freelance.ru',
    color: '#2ecc71',
    registerUrl: 'https://freelance.ru',
    description: 'Российская фриланс-биржа с широким выбором проектов',
  },
  youdo: {
    name: 'Youdo',
    color: '#f5a623',
    registerUrl: 'https://youdo.com',
    description: 'Сервис бытовых и профессиональных услуг',
  },
  // Зарубежные биржи
  upwork: {
    name: 'Upwork',
    color: '#14a800',
    registerUrl: 'https://www.upwork.com/signup',
    description: 'Крупнейшая мировая фриланс-платформа',
  },
  freelancer: {
    name: 'Freelancer.com',
    color: '#29b2fe',
    registerUrl: REFERRAL_TOKENS.freelancer
      ? `https://www.freelancer.com/signup?reference=${REFERRAL_TOKENS.freelancer}`
      : 'https://www.freelancer.com',
    affiliateUrl: 'https://www.freelancer.com/affiliate/',
    description: 'Крупнейшая международная биржа',
  },
  peopleperhour: {
    name: 'PeoplePerHour',
    color: '#f7931a',
    registerUrl: 'https://www.peopleperhour.com/signup',
    description: 'Британская платформа для фрилансеров',
  },
  guru: {
    name: 'Guru.com',
    color: '#5b3cc4',
    registerUrl: 'https://www.guru.com/signup',
    description: 'Международная биржа для профессионалов',
  },
};
