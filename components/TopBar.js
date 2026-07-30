'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './TopBar.module.css';

export function TopBar({ total = 0, todayCount = 0 }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('search') || '');

  // 'ru' — только российские биржи, 'int' — только зарубежные (без РФ).
  const region = params.get('region') === 'int' ? 'int' : 'ru';

  function setRegion(next) {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set('region', next);
    nextParams.delete('source');
    nextParams.delete('page');
    router.push(`/?${nextParams.toString()}`);
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
        <div className={styles.regionTabs} role="tablist" aria-label="Регион бирж">
          <button
            type="button"
            role="tab"
            aria-selected={region === 'ru'}
            className={`${styles.regionTab} ${region === 'ru' ? styles.regionTabActive : ''}`}
            onClick={() => setRegion('ru')}
          >
            🇷🇺 Россия
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={region === 'int'}
            className={`${styles.regionTab} ${region === 'int' ? styles.regionTabActive : ''}`}
            onClick={() => setRegion('int')}
          >
            🌍 Весь мир
          </button>
        </div>

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
