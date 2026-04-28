'use client';
import { useState, useEffect } from 'react';
import styles from './pricing.module.css';

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null = ещё не загружено
  const [isPremium, setIsPremium] = useState(false);
  const [yookassaLoading, setYookassaLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromAi, setFromAi] = useState(false);

  useEffect(() => {
    // Понимаем откуда юзер — если из попытки сгенерить AI-отклик, показываем спецзаголовок
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('from') === 'ai') setFromAi(true);
    } catch {}

    // Проверяем статус
    fetch('/api/profile/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setIsLoggedIn(true);
          const active = !!data.is_premium && (
            !data.premium_until || new Date(data.premium_until) > new Date()
          );
          setIsPremium(active);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => setIsLoggedIn(false));
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

  return (
    <div className={styles.page}>
      <a href="/" className={styles.back}>← Назад</a>

      <div className={styles.hero}>
        <span className={styles.badge}>⚡ Премиум</span>
        <h1 className={styles.title}>
          {fromAi ? 'AI-отклики доступны в премиум' : 'Открой все проекты'}
        </h1>
        <p className={styles.sub}>
          {fromAi
            ? 'AI-генерация откликов — премиум-фича. Подключай и пиши отклики в один клик.'
            : 'Без подписки видны только 5 заказов. Премиум открывает доступ ко всем проектам, AI-откликам и Telegram-уведомлениям.'}
        </p>
      </div>

      {isPremium && (
        <div className={styles.premiumActive}>
          ✓ У тебя уже активен премиум. Возвращайся в ленту →
          <a href="/" className={styles.premiumActiveLink}>На главную</a>
        </div>
      )}

      <div className={styles.features}>
        {[
          { icon: '🚀', text: 'Все заказы со всех бирж — без лимита' },
          { icon: '🔔', text: 'Личные уведомления в Telegram' },
          { icon: '✦', text: 'AI-генерация откликов в один клик' },
          { icon: '🔍', text: 'Фильтры по категориям и стеку' },
          { icon: '📊', text: '% совпадения для каждого заказа' },
          { icon: '⚡', text: 'Обновление каждую минуту' },
        ].map(f => (
          <div key={f.text} className={styles.feature}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <div className={styles.plans}>
        {/* RU тариф */}
        <div className={styles.plan}>
          <div className={styles.planHeader}>
            <span className={styles.planFlag}>🇷🇺</span>
            <div>
              <p className={styles.planName}>Россия и СНГ</p>
              <p className={styles.planDesc}>Карты МИР, VISA/MC из РФ · YooKassa</p>
            </div>
          </div>
          <div className={styles.planPrice}>
            <span className={styles.price}>149</span>
            <span className={styles.currency}>₽</span>
            <span className={styles.period}>/ 30 дней</span>
          </div>
          <button
            onClick={payYookassa}
            className={styles.payBtn}
            disabled={yookassaLoading || stripeLoading || isPremium}
          >
            {yookassaLoading ? 'Создаём платёж...' : isPremium ? 'Уже активен' : 'Оплатить через YooKassa'}
          </button>
        </div>

        {/* International тариф */}
        <div className={styles.plan}>
          <div className={styles.planHeader}>
            <span className={styles.planFlag}>🌍</span>
            <div>
              <p className={styles.planName}>Зарубежные карты</p>
              <p className={styles.planDesc}>Любые мировые карты · Stripe</p>
            </div>
          </div>
          <div className={styles.planPrice}>
            <span className={styles.price}>$5</span>
            <span className={styles.period}>/ 30 days</span>
          </div>
          <button
            onClick={payStripe}
            className={styles.payBtn}
            disabled={yookassaLoading || stripeLoading || isPremium}
          >
            {stripeLoading ? 'Создаём платёж...' : isPremium ? 'Already active' : 'Pay via Stripe'}
          </button>
        </div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {isLoggedIn === false && (
        <p className={styles.note}>
          Сначала <a href="/register?redirect=/pricing">зарегистрируйся</a> —
          подписка привязывается к аккаунту.
        </p>
      )}

      <p className={styles.note}>
        Подписка на 30 дней без автопродления. Сам решаешь когда продлить — никаких сюрпризов в платежах.
      </p>
    </div>
  );
}
