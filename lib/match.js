// lib/match.js — алгоритм процента совпадения проекта с профилем

export function calcMatch(project, profile) {
  if (!profile) return null;

  const {
    skills = [],
    keywords = [],
    excluded_keywords = [],
    min_budget = 0,
    preferred_sources = [],
    filter_categories = [],
  } = profile;

  // Если профиль пустой — не показываем %
  if (!skills.length && !keywords.length && !filter_categories.length) return null;

  const text = ((project.title || '') + ' ' + (project.description || '')).toLowerCase();
  let score = 0;
  let maxScore = 0;

  // 1. Категория (30 очков)
  if (filter_categories.length > 0) {
    maxScore += 30;
    if (filter_categories.includes(project.category)) score += 30;
  }

  // 2. Навыки/специализация (30 очков)
  if (skills.length > 0) {
    maxScore += 30;
    const matched = skills.filter(s => text.includes(s.toLowerCase()));
    score += Math.round((matched.length / skills.length) * 30);
  }

  // 3. Ключевые слова (20 очков)
  if (keywords.length > 0) {
    maxScore += 20;
    const matched = keywords.filter(k => text.includes(k.toLowerCase()));
    score += Math.round((matched.length / keywords.length) * 20);
  }

  // 4. Бюджет (20 очков)
  if (min_budget > 0) {
    maxScore += 20;
    const budget = project.budget_min || project.budget_max || 0;
    if (budget >= min_budget) score += 20;
    else if (budget > 0 && budget >= min_budget * 0.7) score += 10;
  }

  // 5. Источник (бонус без штрафа)
  if (preferred_sources.length > 0 && preferred_sources.includes(project.source)) {
    score += 5;
  }

  // 6. Стоп-слова — сразу 0%
  if (excluded_keywords.length > 0) {
    const hasExcluded = excluded_keywords.some(k => text.includes(k.toLowerCase()));
    if (hasExcluded) return 0;
  }

  if (maxScore === 0) return null;

  return Math.min(100, Math.round((score / maxScore) * 100));
}

export function getMatchLabel(pct) {
  if (pct === null) return null;
  if (pct >= 80) return { label: `${pct}% совпадение`, color: '#22c55e' };
  if (pct >= 50) return { label: `${pct}% совпадение`, color: '#f5a623' };
  if (pct >= 20) return { label: `${pct}% совпадение`, color: '#94a3b8' };
  return { label: `${pct}% совпадение`, color: '#ef4444' };
}
