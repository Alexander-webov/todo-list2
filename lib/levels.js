// lib/levels.js — прогрессия уровней на основе XP
// XP начисляется за: отклики (+10), visit streak (+5–15), жирные отклики (+5)

export const LEVELS = [
  { key: 'newbie',   label: 'Новичок',      emoji: '🌱', minXp: 0,    color: '#6b7280' },
  { key: 'junior',   label: 'Джуниор',      emoji: '🚀', minXp: 50,   color: '#3b82f6' },
  { key: 'middle',   label: 'Миддл',        emoji: '⚡', minXp: 200,  color: '#8b5cf6' },
  { key: 'senior',   label: 'Сеньор',       emoji: '💎', minXp: 600,  color: '#a78bfa' },
  { key: 'master',   label: 'Мастер',       emoji: '👑', minXp: 1500, color: '#f59e0b' },
  { key: 'legend',   label: 'Легенда',      emoji: '🔥', minXp: 4000, color: '#ef4444' },
];

export function levelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = LEVELS[0];
  let next = LEVELS[1] || null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safeXp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }
  const toNext = next ? Math.max(0, next.minXp - safeXp) : 0;
  const range = next ? next.minXp - current.minXp : 1;
  const progress = next ? Math.min(100, Math.round(((safeXp - current.minXp) / range) * 100)) : 100;
  return { current, next, xp: safeXp, toNext, progress };
}

// Мотивирующий текст уровня
export function levelCopy(xp) {
  const { current, next, toNext } = levelFromXp(xp);
  if (!next) {
    return `Ты на вершине — уровень ${current.label}. Продолжай в том же духе!`;
  }
  return `До уровня «${next.label}» осталось ${toNext} XP`;
}
