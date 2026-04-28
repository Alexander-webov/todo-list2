'use client';
import { useEffect, useState } from 'react';
import { levelFromXp } from '@/lib/levels';
import styles from './WelcomeBackBanner.module.css';

// Компонент делает одну работу: дёргает /api/visit/ping при заходе
// и показывает мотивационный баннер если день новый.
// Невидим для гостей.
//
// Вызывается один раз в <HomePage />.

export function WelcomeBackBanner() {
  const [data, setData] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Пингуем визит один раз при монтировании
    (async () => {
      try {
        const res = await fetch('/api/visit/ping', { method: 'POST' });
        const d = await res.json();
        if (!cancelled) setData(d);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!data || data.isGuest || hidden) return null;
  if (!data.isNewDay) return null; // показываем только при смене суток

  const { streak, xp, newProjectsSinceLastVisit } = data;
  const levelInfo = levelFromXp(xp);

  let title, line;
  if (streak >= 7) {
    title = `🔥 ${streak} дней подряд! Ты в ударе`;
    line = 'Топ-1% активных пользователей возвращается столько же. Серьёзно.';
  } else if (streak >= 3) {
    title = `🔥 ${streak} дней подряд`;
    line = 'Не теряй темп — стрики отлично коррелируют с получением заказов.';
  } else if (streak === 2) {
    title = '👋 С возвращением!';
    line = 'Два дня подряд — так и появляются привычки. Завтра будет +1 к стрику.';
  } else if (streak === 1) {
    title = '👋 Добро пожаловать';
    line = 'Это твой первый день — начнём копить стрик ежедневных посещений.';
  }

  let projectsLine = null;
  if (newProjectsSinceLastVisit > 0) {
    projectsLine = `${newProjectsSinceLastVisit.toLocaleString('ru')} новых заказов с твоего последнего визита`;
  }

  return (
    <div className={styles.banner}>
      <button className={styles.close} onClick={() => setHidden(true)} aria-label="Скрыть">×</button>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.line}>{line}</div>
        {projectsLine && <div className={styles.projects}>📦 {projectsLine}</div>}
        {xp > 0 && (
          <div className={styles.levelLine} style={{ color: levelInfo.current.color }}>
            {levelInfo.current.emoji} {levelInfo.current.label}
            {levelInfo.next && (
              <span className={styles.levelProgress}>
                · {xp} XP {levelInfo.next ? `/ ${levelInfo.next.minXp}` : ''}
              </span>
            )}
          </div>
        )}
      </div>
      <div className={styles.badges}>
        {streak > 0 && (
          <div className={styles.badge}>
            <div className={styles.badgeNum}>{streak}</div>
            <div className={styles.badgeLabel}>дней</div>
          </div>
        )}
        {xp > 0 && (
          <div className={styles.badge}>
            <div className={styles.badgeNum}>{xp}</div>
            <div className={styles.badgeLabel}>XP</div>
          </div>
        )}
      </div>
    </div>
  );
}
