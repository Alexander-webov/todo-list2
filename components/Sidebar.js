'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Sidebar.module.css';

const RU_SOURCES = [
  { key: 'fl', label: 'FL.RU' },
  { key: 'kwork', label: 'Kwork' },
  { key: 'freelanceru', label: 'Freelance.ru' },
  { key: 'youdo', label: 'Youdo' },
];

const INT_SOURCES = [
  { key: 'freelancer', label: 'Freelancer' },
  { key: 'peopleperhour', label: 'People Per Hour' },
  { key: 'guru', label: 'Guru' },
];

// Группы категорий по дизайну: каждая группа имеет свои подкатегории.
// dbCategory — это значение, которое уйдёт в фильтр (?category=...).
const CATEGORY_GROUPS = [
  {
    key: 'design',
    label: 'Дизайн',
    emoji: '🎨',
    subs: [
      { label: 'UI/UX', dbCategory: 'Web дизайн' },
      { label: 'Web дизайн', dbCategory: 'Web дизайн' },
      { label: 'Графический дизайн', dbCategory: 'Графический дизайн' },
      { label: 'Брендинг / Логотипы', dbCategory: 'Графический дизайн' },
      { label: 'Презентации', dbCategory: 'Графический дизайн' },
      { label: 'Баннеры / Ads', dbCategory: 'Графический дизайн' },
      { label: 'Иллюстрации', dbCategory: 'Графический дизайн' },
      { label: '3D / Motion', dbCategory: 'Видеомонтаж' },
    ],
  },
  {
    key: 'dev',
    label: 'Разработка',
    emoji: '💻',
    subs: [
      { label: 'FrontEnd', dbCategory: 'FrontEnd' },
      { label: 'BackEnd', dbCategory: 'BackEnd' },
      { label: 'Вёрстка', dbCategory: 'Вёрстка' },
      { label: 'WordPress / Tilda / CMS', dbCategory: 'WordPress / Tilda / CMS' },
      { label: 'Парсинг', dbCategory: 'Парсинг' },
    ],
  },
  {
    key: 'marketing',
    label: 'Маркетинг',
    emoji: '📊',
    subs: [
      { label: 'SMM', dbCategory: 'SMM' },
    ],
  },
  {
    key: 'content',
    label: 'Контент',
    emoji: '📰',
    subs: [
      { label: 'SMM / Контент', dbCategory: 'SMM' },
    ],
  },
  {
    key: 'video',
    label: 'Видео / Аудио',
    emoji: '🎬',
    subs: [
      { label: 'Видеомонтаж', dbCategory: 'Видеомонтаж' },
    ],
  },
  {
    key: 'ai',
    label: 'AI / Автоматизация',
    emoji: '🤖',
    subs: [
      { label: 'Парсинг / Боты', dbCategory: 'Парсинг' },
    ],
  },
  {
    key: 'analytics',
    label: 'Аналитика',
    emoji: '📈',
    subs: [
      { label: 'Другое', dbCategory: 'Другое' },
    ],
  },
  {
    key: 'other',
    label: 'Другое',
    emoji: '🚀',
    subs: [
      { label: 'Другое', dbCategory: 'Другое' },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const params = useSearchParams();
  const activeSource = params.get('source') || '';
  const activeCategory = params.get('category') || '';
  const [counts, setCounts] = useState({});
  const [sourceCounts, setSourceCounts] = useState({});
  const [openGroup, setOpenGroup] = useState('design'); // по дефолту открыта Дизайн (как в макете)

  useEffect(() => {
    fetch('/api/stats/categories')
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {});
    fetch('/api/stats/sources')
      .then(r => r.ok ? r.json() : {})
      .then(setSourceCounts)
      .catch(() => {});
  }, []);

  function setFilter(key, value) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    if (key === 'category' && next.get('category')) next.delete('role');
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  function resetFilters() {
    const next = new URLSearchParams(params.toString());

    next.delete('source');
    next.delete('category');
    next.delete('role');
    next.delete('region');
    next.delete('search');
    next.delete('page');

    router.push(next.toString() ? `/?${next.toString()}` : '/');
  }

  function toggleGroup(key) {
    setOpenGroup(prev => prev === key ? null : key);
  }

  return (
    <aside className={styles.sidebar}>
      <p className={styles.mainTitle}>Фильтр по проектам</p>

      {/* Российские биржи */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Российские биржи</p>
        <div className={styles.filterList}>
          {RU_SOURCES.map((s) => {
            const isActive = activeSource === s.key;
            return (
              <button
                key={s.key}
                className={`${styles.checkBtn} ${isActive ? styles.checkBtnActive : ''}`}
                onClick={() => setFilter('source', s.key)}
              >
                <span className={`${styles.checkbox} ${isActive ? styles.checkboxOn : ''}`}>
                  {isActive && <span className={styles.checkMark}>✓</span>}
                </span>
                <span className={styles.checkLabel}>{s.label}</span>
                {sourceCounts[s.key] !== undefined && (
                  <span className={styles.checkCount}>{sourceCounts[s.key]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Зарубежные биржи */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Зарубежные биржи</p>
        <div className={styles.filterList}>
          {INT_SOURCES.map((s) => {
            const isActive = activeSource === s.key;
            return (
              <button
                key={s.key}
                className={`${styles.checkBtn} ${isActive ? styles.checkBtnActive : ''}`}
                onClick={() => setFilter('source', s.key)}
              >
                <span className={`${styles.checkbox} ${isActive ? styles.checkboxOn : ''}`}>
                  {isActive && <span className={styles.checkMark}>✓</span>}
                </span>
                <span className={styles.checkLabel}>{s.label}</span>
                {sourceCounts[s.key] !== undefined && (
                  <span className={styles.checkCount}>{sourceCounts[s.key]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Группы категорий */}
      <div className={styles.groupsBlock}>
        {CATEGORY_GROUPS.map((g) => {
          const isOpen = openGroup === g.key;
          return (
            <div key={g.key} className={styles.group}>
              <button
                className={`${styles.groupHeader} ${isOpen ? styles.groupHeaderOpen : ''}`}
                onClick={() => toggleGroup(g.key)}
              >
                <span className={styles.groupEmoji}>{g.emoji}</span>
                <span className={styles.groupLabel}>{g.label}</span>
                <span className={`${styles.groupArrow} ${isOpen ? styles.groupArrowOpen : ''}`}>▼</span>
              </button>
              {isOpen && (
                <div className={styles.subsList}>
                  {g.subs.map((sub, idx) => {
                    const isActive = activeCategory === sub.dbCategory;
                    return (
                      <button
                        key={`${sub.label}-${idx}`}
                        className={`${styles.subBtn} ${isActive ? styles.subBtnActive : ''}`}
                        onClick={() => setFilter('category', sub.dbCategory)}
                      >
                        <span className={styles.subLabel}>{sub.label}</span>
                        {counts[sub.dbCategory] !== undefined && (
                          <span className={styles.subCount}>{counts[sub.dbCategory]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.resetBtn}
        onClick={resetFilters}
      >
        <span className={styles.resetIcon}>↺</span>
        Сбросить фильтр
      </button>
    </aside>
  );
}
