// lib/competition.js
// Логика "счётчика конкуренции" — возвращает информацию для badge на карточке.
//
// Идея: чем меньше откликов и чем свежее проект — тем "горячее" карточка.
// 0 откликов + <15 мин = 🔥 "Возьми первым"
// Много откликов или старый = "Холодный"
//
// Источники, у которых нет bid_count (FL.ru RSS): показываем только свежесть.

function pluralRu(n, one, two, five) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
  return five;
}

function formatTimeShort(minutes) {
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${Math.round(minutes)} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${pluralRu(days, 'день', 'дня', 'дней')}`;
}

/**
 * Возвращает { label, sublabel, tone, hot, pulse, score } или null.
 * tone: 'fire' | 'fresh' | 'ok' | 'warm' | 'cold' | 'unknown'
 * hot: true — карточку подсвечиваем (свечение/рамка)
 * pulse: true — мягкая пульсация (только для самых горячих)
 */
export function getCompetition(project) {
  if (!project) return null;

  const bidCount = project.bid_count;
  const publishedAt = project.published_at || project.created_at;
  const minutesAgo = publishedAt
    ? Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 60000)
    : null;

  // ============================================================
  // Случай 1: bid_count неизвестен (FL.ru RSS, старые записи)
  // Показываем только по свежести, без числа откликов.
  // ============================================================
  if (bidCount === null || bidCount === undefined) {
    if (minutesAgo === null) return null;

    if (minutesAgo < 5) {
      return {
        label: '🔥 Только что появился',
        sublabel: 'будь первым',
        tone: 'fire',
        hot: true,
        pulse: true,
      };
    }
    if (minutesAgo < 20) {
      return {
        label: `🔥 Свежий · ${formatTimeShort(minutesAgo)}`,
        tone: 'fresh',
        hot: true,
      };
    }
    if (minutesAgo < 60) {
      return {
        label: `⚡ Недавно · ${formatTimeShort(minutesAgo)}`,
        tone: 'ok',
      };
    }
    // старше часа — не показываем badge (иначе он будет на каждой второй карточке)
    return null;
  }

  // ============================================================
  // Случай 2: знаем точное число откликов
  // ============================================================
  const n = Math.max(0, Number(bidCount) || 0);

  // 0 откликов — главный магнит
  if (n === 0) {
    if (minutesAgo !== null && minutesAgo < 15) {
      return {
        label: '🔥 0 откликов',
        sublabel: `${formatTimeShort(minutesAgo)} назад`,
        tone: 'fire',
        hot: true,
        pulse: true,
      };
    }
    if (minutesAgo !== null && minutesAgo < 120) {
      return {
        label: '🔥 0 откликов',
        sublabel: `${formatTimeShort(minutesAgo)}`,
        tone: 'fresh',
        hot: true,
      };
    }
    // 0 откликов, но проект уже старый — странно, но показываем
    return {
      label: '0 откликов',
      sublabel: minutesAgo ? formatTimeShort(minutesAgo) : null,
      tone: 'ok',
    };
  }

  // 1–3 отклика — ещё реально попасть в топ
  if (n <= 3) {
    return {
      label: `⚡ ${n} ${pluralRu(n, 'отклик', 'отклика', 'откликов')}`,
      sublabel: minutesAgo !== null ? formatTimeShort(minutesAgo) : null,
      tone: 'ok',
    };
  }

  // 4–8 — можно попробовать
  if (n <= 8) {
    return {
      label: `${n} ${pluralRu(n, 'отклик', 'отклика', 'откликов')}`,
      sublabel: 'есть шанс',
      tone: 'warm',
    };
  }

  // 9–20 — высокая конкуренция
  if (n <= 20) {
    return {
      label: `${n} откликов`,
      sublabel: 'высокая конкуренция',
      tone: 'cold',
    };
  }

  // 20+ — поздно
  return {
    label: `${n}+ откликов`,
    sublabel: 'поздно',
    tone: 'cold',
  };
}

/**
 * Цвета для разных tone — используем в компоненте для инлайн-стилей.
 */
export const COMPETITION_COLORS = {
  fire:    { fg: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)',  border: 'rgba(239, 68, 68, 0.4)' },
  fresh:   { fg: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)' },
  ok:      { fg: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)',  border: 'rgba(34, 197, 94, 0.3)' },
  warm:    { fg: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)',  border: 'rgba(245, 158, 11, 0.28)' },
  cold:    { fg: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)' },
  unknown: { fg: '#6b7a99', bg: 'rgba(107, 122, 153, 0.08)', border: 'rgba(107, 122, 153, 0.2)' },
};
