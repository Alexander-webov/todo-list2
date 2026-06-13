'use client';
import { useEffect, useState } from 'react';
import styles from './PromoModal.module.css';
import { getPrice, DISCOUNT_ACTIVE, DISCOUNT_PERCENT } from '@/lib/pricing';

// Попап акции −50%.
// Показывается:
//   - гостям И залогиненным БЕЗ активного премиума
//   - один раз за визит (сессию вкладки) — на следующий заход покажется снова
//   - с задержкой 1.5с после загрузки, чтобы не бить по глазам сразу
// Премиум-юзеры не видят попап никогда.
// Подключается один раз в layout.

const SESSION_KEY = 'promo50_shown';
const DEADLINE_KEY = 'promo50_deadline';
const SHOW_DELAY_MS = 1500;
const COUNTDOWN_MS = 15 * 60 * 1000; // 15 минут "ограниченного времени" на визит

const RU = getPrice('ru');
const INT = getPrice('int');

function getDeadline() {
  try {
    const saved = sessionStorage.getItem(DEADLINE_KEY);
    if (saved) {
      const t = parseInt(saved, 10);
      if (t > Date.now()) return t;
    }
  } catch {}
  const t = Date.now() + COUNTDOWN_MS;
  try { sessionStorage.setItem(DEADLINE_KEY, String(t)); } catch {}
  return t;
}

export function PromoModal() {
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState(COUNTDOWN_MS);

  useEffect(() => {
    if (!DISCOUNT_ACTIVE) return;

    // Уже показывали в этой сессии?
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {}

    let cancelled = false;

    // Проверяем премиум-статус: премиуму попап не показываем
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const isPremium =
          data &&
          !!data.is_premium &&
          (!data.premium_until || new Date(data.premium_until) > new Date());
        if (isPremium) return; // премиум — не показываем

        // Гость или обычный юзер без премиума → показываем
        setTimeout(() => {
          if (cancelled) return;
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
          setVisible(true);
          if (typeof window !== 'undefined' && window.ym) {
            const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
            if (id) window.ym(id, 'reachGoal', 'promo_modal_shown');
          }
        }, SHOW_DELAY_MS);
      })
      .catch(() => {
        // Если /api/profile/me недоступен — считаем гостем, показываем
        if (cancelled) return;
        setTimeout(() => {
          if (cancelled) return;
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
          setVisible(true);
        }, SHOW_DELAY_MS);
      });

    return () => { cancelled = true; };
  }, []);

  // Таймер обратного отсчёта
  useEffect(() => {
    if (!visible) return;
    const deadline = getDeadline();
    const tick = () => {
      const diff = deadline - Date.now();
      setLeft(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible]);

  function goToPricing() {
    if (typeof window !== 'undefined' && window.ym) {
      const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (id) window.ym(id, 'reachGoal', 'promo_modal_click');
    }
    window.location.href = '/pricing';
  }

  if (!visible) return null;

  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  return (
    <div className={styles.overlay} onClick={() => setVisible(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.close}
          onClick={() => setVisible(false)}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className={styles.badge}>🔥 Ограниченное предложение</div>

        <h2 className={styles.title}>
          Скидка <span className={styles.percent}>−{DISCOUNT_PERCENT}%</span> на премиум
        </h2>

        <p className={styles.sub}>
          Открой все заказы со всех бирж, AI-отклики и уведомления в Telegram.
          Сейчас — в два раза дешевле.
        </p>

        <div className={styles.prices}>
          <div className={styles.priceRow}>
            <span className={styles.old}>{RU.base} ₽</span>
            <span className={styles.now}>{RU.final} ₽</span>
            <span className={styles.per}>/ 30 дней</span>
          </div>
          <div className={styles.priceRowAlt}>
            или ${INT.final} <s>${INT.base}</s> для зарубежных карт
          </div>
        </div>

        <div className={styles.timer}>
          Предложение сгорает через{' '}
          <span className={styles.clock}>
            {mm}:{ss}
          </span>
        </div>

        <button className={styles.cta} onClick={goToPricing}>
          Забрать скидку −{DISCOUNT_PERCENT}% →
        </button>

        <button className={styles.dismiss} onClick={() => setVisible(false)}>
          Нет, я переплачу потом
        </button>
      </div>
    </div>
  );
}
