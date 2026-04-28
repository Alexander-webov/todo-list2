'use client';
import { useEffect, useState } from 'react';
import styles from './ExitIntent.module.css';

// Exit-intent модалка. Показывается только:
// - гостям (не залогинен)
// - один раз за сессию
// - после того как юзер провёл на странице хотя бы 20 секунд (не на случайно зашедших)
// - при движении мыши к верхней границе viewport (тот же триггер что у OptinMonster и прочих)
//
// Подключается один раз в layout'е. Сам вычисляет isGuest через /api/auth/me
// (или можно прокинуть isLoggedIn из SSR — ниже в layout подключение).

const SESSION_KEY = 'exit_intent_shown';
const MIN_TIME_MS = 20 * 1000; // минимум 20 сек на сайте

export function ExitIntent({ isLoggedIn = false }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Не показываем залогиненным
    if (isLoggedIn) return;
    // Не показываем если уже показали в этой сессии
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {}

    const startTime = Date.now();

    function onMouseMove(e) {
      // Триггер: курсор ушёл выше 10px от верхней границы (к закрытию вкладки)
      if (e.clientY > 10) return;
      if (Date.now() - startTime < MIN_TIME_MS) return;
      trigger();
    }

    function onMouseLeave(e) {
      // Второй триггер — курсор физически покинул окно через верх
      if (e.clientY > 0) return;
      if (Date.now() - startTime < MIN_TIME_MS) return;
      trigger();
    }

    function trigger() {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setVisible(true);
      document.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [isLoggedIn]);

  async function submit(e) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Введи корректный email');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent' }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError('Не удалось сохранить. Попробуй ещё раз.');
      }
    } catch {
      setError('Ошибка сети.');
    }
    setSubmitting(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={() => setVisible(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={() => setVisible(false)} aria-label="Закрыть">×</button>

        {!done ? (
          <>
            <div className={styles.icon}>📬</div>
            <h2 className={styles.title}>Подожди, не уходи просто так</h2>
            <p className={styles.sub}>
              Оставь email — будем раз в неделю присылать <b>топ-10 самых жирных заказов</b> по
              твоему профилю за прошедшие 7 дней. Без спама, одним письмом.
            </p>

            <form className={styles.form} onSubmit={submit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={styles.input}
                autoFocus
                required
              />
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Сохраняю…' : 'Получать топ заказов →'}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.alt}>
              Или <a href="/register" className={styles.altLink}>зарегистрируйся бесплатно</a> — там ещё AI-отклики, Telegram-уведомления и % совпадения для каждого заказа.
            </p>
          </>
        ) : (
          <>
            <div className={styles.iconDone}>✓</div>
            <h2 className={styles.title}>Готово! Ждём тебя в понедельник</h2>
            <p className={styles.sub}>
              Первое письмо придёт в начале следующей недели.
              А если хочешь больше — <a href="/register" className={styles.altLink}>создай аккаунт</a>:
              там дашь свой стек и будешь получать <b>ежедневные</b> подборки
              именно под твои навыки.
            </p>
            <button className={styles.okBtn} onClick={() => setVisible(false)}>
              Окей, смотрю дальше
            </button>
          </>
        )}
      </div>
    </div>
  );
}
