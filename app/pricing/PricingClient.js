'use client';
import { useState, useEffect } from 'react';
import styles from './pricing.module.css';
import { getPrice, DISCOUNT_ACTIVE, DISCOUNT_PERCENT } from '@/lib/pricing';
import { PremiumQuiz } from '@/components/PremiumQuiz';

const RU = getPrice('ru');
const INT = getPrice('int');

export function PricingClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null = ещё не загружено
  const [isPremium, setIsPremium] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const [yookassaLoading, setYookassaLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
          setWalletBalance(data.wallet_balance || 0);
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
      const res = await fetch('/api/payment/yookassa/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_wallet: useWallet && walletBalance > 0 }),
      });
      const data = await res.json();

      if (data.activated_free) {
        // Баланса хватило на всю сумму — премиум уже активирован без похода в YooKassa
        window.location.href = '/pricing?payment=success';
        return;
      }

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

      {DISCOUNT_ACTIVE && (
        <div className={styles.promoBanner}>
          🔥 Акция: <b>−{DISCOUNT_PERCENT}%</b> на премиум — только ограниченное время
        </div>
      )}

      <div className={styles.hero}>
        <span className={styles.badge}>⚡ Премиум</span>
        <h1 className={styles.title}>Открой все проекты</h1>
        <p className={styles.sub}>
          Без подписки видны только 5 заказов. Премиум открывает доступ ко всем проектам,
          вакансиям и Telegram-уведомлениям.
        </p>
      </div>

      {isPremium && (
        <div className={styles.premiumActive}>
          ✓ У тебя уже активен премиум. Возвращайся в ленту →
          <a href="/" className={styles.premiumActiveLink}>На главную</a>
        </div>
      )}

      {!isPremium && <PremiumQuiz />}

      <div className={styles.features}>
        {[
          { icon: '🚀', text: 'Все заказы со всех бирж — без лимита' },
          { icon: '🔔', text: 'Личные уведомления в Telegram' },
          { icon: '🌍', text: 'Удалённые вакансии — весь мир и Россия' },
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

      <div className={styles.plans} id="plans">
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
            {RU.discountActive && (
              <span className={styles.oldPrice}>{RU.base}</span>
            )}
            <span className={styles.price}>{RU.final}</span>
            <span className={styles.currency}>₽</span>
            <span className={styles.period}>/ 30 дней</span>
            {RU.discountActive && (
              <span className={styles.saleBadge}>−{RU.discountPercent}%</span>
            )}
          </div>
          {isLoggedIn && walletBalance > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
              Списать баланс сайта ({walletBalance.toLocaleString('ru')} ₽) — итого {Math.max(RU.final - (useWallet ? walletBalance : 0), 0)} ₽
            </label>
          )}
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
            {INT.discountActive && (
              <span className={styles.oldPrice}>${INT.base}</span>
            )}
            <span className={styles.price}>${INT.final}</span>
            <span className={styles.period}>/ 30 days</span>
            {INT.discountActive && (
              <span className={styles.saleBadge}>−{INT.discountPercent}%</span>
            )}
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
      <p className={styles.note}>
        Оплачивая, вы соглашаетесь с <a href="/terms">условиями использования</a>.
      </p>

      <div className={styles.otherTools}>
        <h2 className={styles.otherToolsTitle}>Другие платные инструменты</h2>
        <p className={styles.otherToolsHint}>Не входят в премиум — отдельные разовые покупки.</p>
        <a href="/ai-response" className={styles.otherToolCard}>
          <span>✨ AI-отклики</span>
          <span className={styles.otherToolPrice}>1-я бесплатно · 10 за 99 ₽ · 100 за 499 ₽</span>
        </a>
        <a href="/resume-builder" className={styles.otherToolCard}>
          <span>📄 Конструктор резюме</span>
          <span className={styles.otherToolPrice}>1-е бесплатно · +10 за 499 ₽</span>
        </a>
      </div>
    </div>
  );
}
