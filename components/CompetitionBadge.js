'use client';
import { getCompetition, COMPETITION_COLORS } from '@/lib/competition';
import styles from './CompetitionBadge.module.css';

/**
 * Badge "счётчика конкуренции".
 * Использование:
 *   <CompetitionBadge project={project} />
 *
 * Возвращает null, если нечего показывать (старый проект без данных).
 */
export function CompetitionBadge({ project, size = 'md' }) {
  const info = getCompetition(project);
  if (!info) return null;

  const colors = COMPETITION_COLORS[info.tone] || COMPETITION_COLORS.unknown;

  const cls = [
    styles.badge,
    size === 'sm' ? styles.sm : styles.md,
    info.pulse ? styles.pulse : '',
    info.hot ? styles.hot : '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={cls}
      style={{
        color: colors.fg,
        background: colors.bg,
        borderColor: colors.border,
      }}
      title={info.sublabel ? `${info.label} — ${info.sublabel}` : info.label}
    >
      <span className={styles.label}>{info.label}</span>
      {info.sublabel && (
        <span className={styles.sub}>· {info.sublabel}</span>
      )}
    </span>
  );
}
