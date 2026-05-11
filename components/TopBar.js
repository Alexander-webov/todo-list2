'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './TopBar.module.css';

export function TopBar({ total = 0, todayCount = 0 }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('search') || '');

  const region = params.get('region') || 'ru';
  const onlyRu = region === 'ru';

  function toggleRegion() {
    const next = new URLSearchParams(params.toString());
    if (onlyRu) next.set('region', 'all');
    else next.set('region', 'ru');
    next.delete('source');
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set('search', value.trim());
    else next.delete('search');
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  return (
    <div className={styles.bar}>
      <div className={styles.statsBlock}>
        <div className={styles.metricRow}>
          <span className={styles.totalNum}>{total.toLocaleString('ru')}</span>
          <div className={styles.todayBadgeAndtotalLabel}>          {todayCount > 0 && (
            <span className={styles.todayBadge}>+{todayCount.toLocaleString('ru')} сегодня</span>
          )}
            <span className={styles.totalLabel}>активных проектов</span></div>
        </div>
      </div>

      <div className={styles.controls}>
        <label className={styles.toggleWrap}>
          <span className={styles.toggleLabel}>Показывать только РФ</span>
          <span
            className={`${styles.toggle} ${onlyRu ? styles.toggleOn : ''}`}
            onClick={toggleRegion}
            role="switch"
            aria-checked={onlyRu}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleRegion();
              }
            }}
          >
            <span className={styles.toggleDot} />
          </span>
        </label>

        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по проектам..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>Найти</button>
        </form>
      </div>
    </div>
  );
}
