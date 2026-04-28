'use client';
import { levelFromXp } from '@/lib/levels';
import styles from './LevelBadge.module.css';

// Компонент отображения уровня пользователя с прогресс-баром к следующему
// Размеры: 'sm' (компактный, для виджетов) | 'md' (дефолт)
export function LevelBadge({ xp = 0, size = 'md', showProgress = true }) {
  const { current, next, toNext, progress } = levelFromXp(xp);

  return (
    <div className={`${styles.wrap} ${styles[`size_${size}`]}`}>
      <div className={styles.header}>
        <span className={styles.emoji}>{current.emoji}</span>
        <div className={styles.info}>
          <div className={styles.label} style={{ color: current.color }}>
            {current.label}
          </div>
          <div className={styles.xp}>
            {xp.toLocaleString('ru')} XP
            {next && (
              <span className={styles.toNext}>
                · до {next.label} {toNext} XP
              </span>
            )}
          </div>
        </div>
      </div>
      {showProgress && (
        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${current.color}, ${next?.color || current.color})`,
            }}
          />
        </div>
      )}
    </div>
  );
}
