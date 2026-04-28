'use client';
import { useEffect, useState, useCallback } from 'react';
import { LevelBadge } from './LevelBadge';
import styles from './ApplicationMotivator.module.css';

// Событие, которое dispatchит ProjectCard при успешной отправке отклика
const APP_EVENT = 'app:applied';

export function ApplicationMotivator({ initialIsLoggedIn = false }) {
  const [stats, setStats] = useState(null);
  const [visible, setVisible] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/applications/stats');
      const data = await res.json();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    // Обновляем при каждом отправленном отклике
    const onApplied = () => load();
    window.addEventListener(APP_EVENT, onApplied);
    return () => window.removeEventListener(APP_EVENT, onApplied);
  }, [load]);

  if (!stats || stats.isGuest || !visible) return null;

  const { today, target, goodThisWeek, streak, xp } = stats;
  const progress = Math.min(today, target);
  const percent = Math.round((progress / target) * 100);
  const remaining = Math.max(0, target - today);

  // Вычисляем заголовок и подзаголовок на основе прогресса
  let headline, sub, tone;

  if (today === 0) {
    headline = '🎯 Начни откликаться прямо сейчас';
    sub = `По статистике для получения проекта требуется около ${target} откликов. Каждый отклик приближает тебя к результату.`;
    tone = 'neutral';
  } else if (today < 3) {
    headline = `Откликнись ещё ${remaining} раз`;
    sub = `По статистике в 2026 году для получения проекта нужно около ${target} откликов. Не останавливайся — ты только начал.`;
    tone = 'neutral';
  } else if (today < target) {
    if (goodThisWeek >= 3) {
      headline = `Ты откликнулся на ${goodThisWeek} хороших заказа — шанс получить ответ высокий!`;
      sub = `Ещё ${remaining} откликов до статистической гарантии проекта. Не останавливайся.`;
      tone = 'good';
    } else {
      headline = `Отличный темп! Ещё ${remaining} откликов до цели`;
      sub = `Ты уже прошёл ${percent}% пути. Фокусируйся на заказах с бюджетом — они конвертируются лучше.`;
      tone = 'progress';
    }
  } else {
    // Цель выполнена
    headline = `🔥 Дневная цель достигнута — ${today} откликов!`;
    sub = goodThisWeek >= 5
      ? `${goodThisWeek} из них — на жирные заказы. Ты в топ-10% активных фрилансеров. Ответы пойдут в ближайшие 24–48 часов.`
      : 'Статистически ты уже должен получить хотя бы один ответ. Проверяй почту и откликайся на ещё пару проектов для страховки.';
    tone = 'done';
  }

  return (
    <div className={`${styles.widget} ${styles[`tone_${tone}`]}`}>
      <button
        className={styles.close}
        onClick={() => setVisible(false)}
        aria-label="Скрыть"
      >×</button>

      <div className={styles.top}>
        <div className={styles.ring} style={{ '--percent': percent }}>
          <div className={styles.ringInner}>
            <div className={styles.ringNum}>{today}<small>/{target}</small></div>
          </div>
        </div>
        <div className={styles.text}>
          <div className={styles.headline}>{headline}</div>
          <div className={styles.sub}>{sub}</div>
        </div>
      </div>

      <div className={styles.metrics}>
        <Metric label="откликов сегодня" value={today} />
        <Metric label="жирных за неделю" value={goodThisWeek} hint={goodThisWeek >= 3 ? '🔥' : ''} />
        {streak >= 2 && <Metric label="дней подряд" value={streak} hint="🔥" />}
      </div>

      {xp > 0 && (
        <div className={styles.levelRow}>
          <LevelBadge xp={xp} size="sm" />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricValue}>
        {value}{hint && <span className={styles.metricHint}>{hint}</span>}
      </div>
      <div className={styles.metricLabel}>{label}</div>
    </div>
  );
}

// Утилита для ProjectCard — dispatchit событие + фактически трекает отклик
export async function trackApplication(projectId, usedAi = false) {
  try {
    await fetch('/api/applications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, used_ai: usedAi }),
    });
    window.dispatchEvent(new CustomEvent(APP_EVENT));
  } catch {}
}
