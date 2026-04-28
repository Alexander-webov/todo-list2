'use client';
import { useState, useEffect } from 'react';
import styles from './PremiumGate.module.css';

export function PremiumGate({ isLoggedIn = false, totalProjects = 0 }) {
  const [stats, setStats] = useState(null);
  const [yookassaLoading, setYookassaLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function payYookassa() {
    if (!isLoggedIn) {
      window.location.href = '/register?redirect=/pricing';
      return;
    }
    setYookassaLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/yookassa/create', { method: 'POST' });
      const data = await res.json();
      // API может возвращать ключ 'url' или 'confirmation_url' — поддержим оба
      const redirectUrl = data.confirmation_url || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setError(data.error || 'Не удалось создать платёж');
        setYookassaLoading(false);
      }
    } catch {
      setError('Ошибка соединения');
      setYookassaLoading(false);
    }
  }

  async function payStripe() {
    if (!isLoggedIn) {
      window.location.href = '/register?redirect=/pricing';
      return;
    }
    setStripeLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/stripe/create', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Не удалось создать платёж');
        setStripeLoading(false);
      }
    } catch {
      setError('Ошибка соединения');
      setStripeLoading(false);
    }
  }

  const projectsToday = stats?.projectsToday || 0;
  const total = totalProjects || stats?.totalProjects || 0;

  return (
    <div className={styles.gate}>
      <div className={styles.blur} />
      <div className={styles.box}>

        {/* Социальные триггеры */}
        <div className={styles.triggers}>
          <div className={styles.trigger}>
            <span className={styles.triggerFire}>🔥</span>
            <span>+{projectsToday > 0 ? projectsToday : '...'} новых проектов за последние 24 часа</span>
          </div>
          <div className={styles.trigger}>
            <span className={styles.triggerFire}>⚡</span>
            <span>189 фрилансеров уже смотрят все проекты прямо сейчас</span>
          </div>
          <div className={styles.trigger}>
            <span className={styles.triggerFire}>⏱</span>
            <span>Пока ты читаешь это — кто-то уже отправил отклик</span>
          </div>
        </div>

        <span className={styles.icon}>⚡</span>
        <h2 className={styles.title}>
          Ты видишь только 5 из {total ? total.toLocaleString('ru') : '...'} проектов
        </h2>
        <p className={styles.sub}>
          Открой полный доступ и находи заказы <strong>первым</strong> — раньше других фрилансеров.
        </p>

        <div className={styles.perks}>
          <span className={styles.perk}>✓ Все проекты со всех бирж</span>
          <span className={styles.perk}>✓ AI-генерация откликов</span>
          <span className={styles.perk}>✓ Уведомления в Telegram</span>
          <span className={styles.perk}>✓ Фильтры по категориям и стеку</span>
        </div>

        {/* Две кнопки оплаты */}
        <div className={styles.payRow}>
          <button
            className={styles.payBtnRu}
            onClick={payYookassa}
            disabled={yookassaLoading || stripeLoading}
          >
            {yookassaLoading ? '...' : (
              <>
                <span className={styles.payFlag}>🇷🇺</span>
                <span className={styles.payText}>
                  <span className={styles.payAmount}>149 ₽</span>
                  <span className={styles.payLabel}>YooKassa · карты РФ</span>
                </span>
              </>
            )}
          </button>

          <button
            className={styles.payBtnInt}
            onClick={payStripe}
            disabled={yookassaLoading || stripeLoading}
          >
            {stripeLoading ? '...' : (
              <>
                <span className={styles.payFlag}>🌍</span>
                <span className={styles.payText}>
                  <span className={styles.payAmount}>$5</span>
                  <span className={styles.payLabel}>Stripe · мировые карты</span>
                </span>
              </>
            )}
          </button>
        </div>

        <p className={styles.fineprint}>
          Подписка на 30 дней. Без автопродления — оплачиваешь только когда нужно.
        </p>

        {!isLoggedIn && (
          <p className={styles.alt}>
            Нет аккаунта?{' '}
            <a href="/register" className={styles.altLink}>Создай бесплатно</a> —
            это займёт 10 секунд и без аккаунта ничего не получишь.
          </p>
        )}

        {error && <p className={styles.payError}>{error}</p>}
      </div>
    </div>
  );
}
