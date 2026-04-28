/**
 * Скоринг заказов — оцениваем каждый проект по трём параметрам:
 * 1. Свежесть (чем новее — тем лучше)
 * 2. Бюджет (чем выше — тем лучше)
 * 3. Конкуренция (чем меньше времени прошло — тем меньше откликов)
 */

export function scoreProject(project) {
  let score = 0;

  // 1. СВЕЖЕСТЬ — главный параметр
  const publishedAt = project.published_at || project.created_at;
  const minutesAgo = publishedAt
    ? (Date.now() - new Date(publishedAt).getTime()) / 1000 / 60
    : 999;

  if (minutesAgo < 15)       score += 50; // только что появился
  else if (minutesAgo < 60)  score += 35; // меньше часа
  else if (minutesAgo < 360) score += 20; // меньше 6 часов
  else if (minutesAgo < 1440) score += 5; // меньше суток
  // старше суток — 0 баллов за свежесть

  // 2. БЮДЖЕТ
  const budget = project.budget_min || 0;
  const currency = project.currency;

  // Переводим в рубли для сравнения
  const budgetRub = currency === 'USD' ? budget * 90 : budget;

  if (budgetRub >= 50000)      score += 30;
  else if (budgetRub >= 20000) score += 20;
  else if (budgetRub >= 10000) score += 15;
  else if (budgetRub >= 5000)  score += 10;
  else if (budgetRub >= 1000)  score += 5;
  else if (budgetRub === 0)    score += 8; // бюджет не указан — часто договорной

  // 3. КАТЕГОРИЯ — некоторые категории менее конкурентны
  const highDemand = ['BackEnd', 'FrontEnd', 'Парсинг'];
  const lowDemand = ['Графический дизайн', 'SMM'];
  if (highDemand.includes(project.category))  score += 10;
  if (lowDemand.includes(project.category))   score -= 5;

  // Итоговая метка
  if (score >= 70)       return { label: '🔥 Горячий',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   score };
  if (score >= 45)       return { label: '✅ Хороший',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   score };
  if (score >= 25)       return { label: '👍 Нормальный', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', score };
  return                        { label: '❄️ Холодный',  color: '#6b7a99', bg: 'rgba(107,122,153,0.08)', score };
}
