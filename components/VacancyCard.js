'use client';
import styles from './VacancyCard.module.css';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { VACANCY_CATEGORY_EMOJI } from '@/lib/vacancyCategories';
import { VACANCY_SOURCES } from '@/lib/vacancySources';

function formatSalary(min, max, currency) {
  if (!min && !max) return null;
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
  const fmt = (n) => n >= 1000 ? `${Math.round(n / 1000)} 000` : n;
  if (min && max) return `${fmt(min)}${sym} — ${fmt(max)}${sym}`;
  if (min) return `от ${fmt(min)}${sym}`;
  return `до ${fmt(max)}${sym}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ru }); }
  catch { return ''; }
}

export function VacancyCard({ vacancy, style }) {
  const meta = VACANCY_SOURCES[vacancy.source] || { name: vacancy.source, flag: '🌐' };
  const salary = formatSalary(vacancy.salary_min, vacancy.salary_max, vacancy.currency);
  const emoji = VACANCY_CATEGORY_EMOJI[vacancy.category] || '📌';

  return (
    <a
      href={vacancy.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={styles.card}
      style={style}
    >
      <div className={styles.rowTop}>
        <span className={styles.sourceBadge}>{meta.flag} {meta.name}</span>
        <span className={styles.time}>{timeAgo(vacancy.published_at)}</span>
      </div>

      <h3 className={styles.title}>{vacancy.title}</h3>

      {vacancy.company && <div className={styles.company}>{vacancy.company}</div>}

      {vacancy.description && (
        <p className={styles.desc}>{vacancy.description}</p>
      )}

      <div className={styles.rowBottom}>
        <span className={styles.categoryBadge}>{emoji} {vacancy.category}</span>
        {salary && <span className={styles.salary}>{salary}</span>}
      </div>
    </a>
  );
}
