'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Sidebar.module.css';
import adStyles from './AdSlot.module.css';
import { YandexAdSlot } from './AdSlot';
import { ArticleOfDay } from './ArticleOfDay';
import { DonationBanner } from './DonationBanner';
import { ROLES } from '@/lib/roles';

const RU_SOURCES = [
  { key: 'fl', label: 'FL.ru', color: '#ff6600' },
  { key: 'kwork', label: 'Kwork', color: '#ff4d00' },
  { key: 'freelanceru', label: 'Freelance.ru', color: '#2ecc71' },
  { key: 'youdo', label: 'Youdo', color: '#f5a623' },
];

const INT_SOURCES = [
  /*   { key: 'upwork',        label: 'Upwork',          color: '#14a800' }, */
  { key: 'freelancer', label: 'Freelancer.com', color: '#29b2fe' },
  { key: 'peopleperhour', label: 'PeoplePerHour', color: '#f7931a' },
  { key: 'guru', label: 'Guru.com', color: '#5b3cc4' },
];

const CATEGORIES = [
  'WordPress / Tilda / CMS', 'Видеомонтаж', 'Графический дизайн',
  'Web дизайн', 'SMM', 'Парсинг', 'Вёрстка',
  'FrontEnd', 'BackEnd', 'Другое',
];

export function Sidebar() {
  const router = useRouter();
  const params = useSearchParams();
  const activeSource = params.get('source') || '';
  const activeCategory = params.get('category') || '';
  const activeRole = params.get('role') || '';
  const region = params.get('region') || 'ru';
  const [counts, setCounts] = useState({});
  const [sidebarAd, setSidebarAd] = useState(null);

  useEffect(() => {
    fetch('/api/stats/categories')
      .then(r => r.json())
      .then(setCounts)
      .catch(() => { });
    fetch('/api/admin/ads?position=sidebar&active=1')
      .then(r => r.json())
      .then(d => { if (d.ads?.length) setSidebarAd(d.ads[0]); })
      .catch(() => { });
  }, []);

  function setFilter(key, value) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    // Роль и категория взаимоисключающие
    if (key === 'role' && next.get('role')) next.delete('category');
    if (key === 'category' && next.get('category')) next.delete('role');
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  function resetAll() {
    try { sessionStorage.setItem('role_dismissed', '1'); } catch {}
    const next = new URLSearchParams();
    next.set('region', region);
    router.push(`/?${next.toString()}`);
  }

  const hasFilters = activeSource || activeCategory || activeRole;
  const sources = region === 'int' ? INT_SOURCES : RU_SOURCES;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          {region === 'int' ? '🌐 Зарубежные биржи' : '🇷🇺 Российские биржи'}
        </p>
        <div className={styles.filterList}>
          {sources.map((s) => (
            <button key={s.key}
              className={`${styles.filterBtn} ${activeSource === s.key ? styles.active : ''}`}
              onClick={() => setFilter('source', s.key)}>
              <span className={styles.filterDot} style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>По профессии</p>
        <div className={styles.filterList}>
          {ROLES.map((r) => (
            <button key={r.key}
              className={`${styles.filterBtn} ${activeRole === r.key ? styles.active : ''}`}
              onClick={() => setFilter('role', r.key)}>
              <span className={styles.catName}>{r.emoji} {r.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Категории (подробно)</p>
        <div className={styles.filterList}>
          {CATEGORIES.map((cat) => (
            <button key={cat}
              className={`${styles.filterBtn} ${activeCategory === cat ? styles.active : ''}`}
              onClick={() => setFilter('category', cat)}>
              <span className={styles.catName}>{cat}</span>
              {counts[cat] !== undefined && (
                <span className={styles.catCount}>{counts[cat]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button className={styles.resetBtn} onClick={resetAll}>✕ Сбросить фильтры</button>
      )}
      {/* Telegram каналы */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>📢 Telegram-каналы</p>
        <div className={styles.filterList}>
          <a href="https://t.me/allfreelancershere_feed" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
            <span>🇷🇺</span>
            <span>Лучшие заказы РФ</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>→</span>
          </a>
          <a href="https://t.me/allfreelancershere_feed_int" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, marginTop: 6 }}>
            <span>🌐</span>
            <span>Лучшие заказы INT</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>→</span>
          </a>
        </div>
      </div>
      {/* Рекламный блок в сайдбаре */}
      {sidebarAd && (
        <a
          href={sidebarAd.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={adStyles.sidebarAd}
          onClick={() => {
            fetch('/api/ads/click', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: sidebarAd.id }),
            }).catch(() => { });
          }}
        >
          <span className={adStyles.sidebarBadge}>Реклама</span>
          <p className={adStyles.sidebarTitle}>{sidebarAd.title}</p>
          {sidebarAd.description && (
            <p className={adStyles.sidebarDesc}>{sidebarAd.description}</p>
          )}
          <span className={adStyles.sidebarCta}>Подробнее →</span>
        </a>
      )}
      {/* Яндекс РСЯ в сайдбаре */}
      {!sidebarAd && (
        <YandexAdSlot blockId={process.env.NEXT_PUBLIC_YANDEX_RTB_SIDEBAR} />
      )}
      <DonationBanner />
      <ArticleOfDay />
    </aside>
  );
}
