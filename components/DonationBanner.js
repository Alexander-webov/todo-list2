'use client';
import { useEffect, useState } from 'react';
import styles from './DonationBanner.module.css';

export function DonationBanner() {
  const [hidden, setHidden] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Скрываем для премиум-пользователей — они уже поддержали платежом
  useEffect(() => {
    fetch('/api/profile/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const active = !!data.is_premium && (
          !data.premium_until || new Date(data.premium_until) > new Date()
        );
        if (active) setIsPremium(true);
      })
      .catch(() => {});
  }, []);

  if (hidden || isPremium) return null;

  const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL || 'https://www.donationalerts.com/r/allfreelancershere';

  return (
    <div className={styles.banner}>
      <button className={styles.close} onClick={() => setHidden(true)}>×</button>
      <div className={styles.emoji}>❤️</div>
      <p className={styles.title}>Помоги проекту выжить</p>
      <p className={styles.text}>
        allFreelancersHere — бесплатный сервис, который делает один человек.
        Серверы, базы данных, домен — всё стоит денег.
        Даже 100₽ помогут проекту жить и развиваться.
      </p>
      <a href={donationUrl} target="_blank" rel="noopener noreferrer" className={styles.btn}>
        ☕ Поддержать проект
      </a>
      <p className={styles.note}>Каждый рубль идёт на развитие сервиса</p>
    </div>
  );
}
