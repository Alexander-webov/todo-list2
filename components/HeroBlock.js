'use client';
import { useState, useEffect } from 'react';
import styles from './HeroBlock.module.css';

const STATS = [
  { label: 'проектов за 24 часа', value: '3 000+' },
  { label: 'бирж в одном месте', value: '8' },
  { label: 'обновление', value: 'каждую минуту' },
];

const FEATURES = [
  { icon: '🔥', text: '4400+ ПРОЕКТОВ каждый день. Все ТОП сервисы тут!' },
  { icon: '🔔', text: 'Уведомления в Telegram. Легко подключить — всегда на связи!' },
  { icon: '✦', text: 'AI генерирует отклик за тебя — просто нажми кнопку!' },
  { icon: '⚡', text: 'Полностью бесплатно. Без ограничений. Без подписок.' },
];

export function HeroBlock({ isLoggedIn }) {
  const [count, setCount] = useState(3031);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  if (isLoggedIn) return null;

  return (
    <div className={styles.hero}>
      <div className={styles.badge}>
        <span className={styles.dot} />
        <span>Обновляется прямо сейчас</span>
      </div>

      <h1 className={styles.title}>
        Все фриланс-заказы<br />
        <span className={styles.accent}>в одном месте</span>
      </h1>

      <p className={styles.sub}>
        Удобный интерфейс позволяет видеть заказы с ТОПОВЫХ фриланс бирж в реальном времени. Пока кто-то нажимает кнопку обновить и бегает по вкладкам, ты видишь заказ здесь и сейчас, ТЫ ПЕРВЫЙ!   <br />
        AI отклик даёт тебе супер скорость. <strong>Тебя заметят.</strong>
      </p>

      <div className={styles.features}>
        {FEATURES.map((f, i) => (
          <div key={i} className={styles.feature}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <div className={styles.ctas}>
        <a href="/register" className={styles.ctaPrimary}>
          🚀 Зарегистрироваться бесплатно
        </a>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{count.toLocaleString('ru')}</span>
          <span className={styles.statLabel}>проектов за 24 часа</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>8 топовых</span>
          <span className={styles.statLabel}>бирж одновременно</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>1 мин</span>
          <span className={styles.statLabel}>интервал обновления</span>
        </div>
      </div>

      <p className={styles.proof}>
        Уже используют фрилансеры из России и СНГ · 100% бесплатно · Все функции доступны
      </p>
    </div>
  );
}
