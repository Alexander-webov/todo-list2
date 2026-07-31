'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { VacancyCard } from './VacancyCard';
import { PremiumGate } from './PremiumGate';
import { VACANCY_CATEGORIES, VACANCY_CATEGORY_EMOJI } from '@/lib/vacancyCategories';
import { getPrice } from '@/lib/pricing';
import styles from './VacanciesFeed.module.css';

const FREE_LIMIT = 5;

export function VacanciesFeed({ isLoggedIn = false, profile = null }) {
  const [region, setRegion] = useState('ru'); // 'ru' | 'world'
  const [category, setCategory] = useState('');
  const [vacancies, setVacancies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Счётчик запросов — чтобы ответ на устаревший fetch (например, если
  // пользователь быстро переключил вкладку/категорию) не перезаписал
  // состояние поверх более свежего запроса, который мог вернуться раньше.
  const requestId = useRef(0);

  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );

  const load = useCallback(async () => {
    const myId = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ region, limit: '30' });
      if (category) params.set('category', category);
      const res = await fetch(`/api/vacancies?${params.toString()}`);
      const data = await res.json();
      if (myId !== requestId.current) return; // пришёл устаревший ответ — игнорируем
      setVacancies(data.vacancies || []);
      setTotal(data.total || 0);
    } catch {
      if (myId !== requestId.current) return;
      setVacancies([]);
      setTotal(0);
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
  }, [region, category]);

  useEffect(() => { load(); }, [load]);

  const visible = isPremium ? vacancies : vacancies.slice(0, FREE_LIMIT);
  const showGate = !isPremium && vacancies.length > FREE_LIMIT;

  return (
    <div className={styles.wrap}>
      <div className={styles.regionTabs}>
        <button
          className={`${styles.regionTab} ${region === 'ru' ? styles.regionTabActive : ''}`}
          onClick={() => setRegion('ru')}
        >
          🇷🇺 Россия
        </button>
        <button
          className={`${styles.regionTab} ${region === 'world' ? styles.regionTabActive : ''}`}
          onClick={() => setRegion('world')}
        >
          🌍 Весь мир
        </button>
      </div>

      <div className={styles.categoryRow}>
        <button
          className={`${styles.categoryChip} ${category === '' ? styles.categoryChipActive : ''}`}
          onClick={() => setCategory('')}
        >
          Все категории
        </button>
        {VACANCY_CATEGORIES.map(c => (
          <button
            key={c}
            className={`${styles.categoryChip} ${category === c ? styles.categoryChipActive : ''}`}
            onClick={() => setCategory(c)}
          >
            {VACANCY_CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>

      <div className={styles.count}>
        {loading ? 'Загрузка…' : `${total.toLocaleString('ru')} вакансий`}
      </div>

      {loading ? (
        <div className={styles.empty}>Загружаем вакансии…</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>Пока нет вакансий по этому фильтру. Попробуй другую категорию.</div>
      ) : (
        <div className={styles.grid}>
          {visible.map((v, i) => (
            <VacancyCard key={v.id} vacancy={v} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} />
          ))}
        </div>
      )}

      {showGate && (
        isLoggedIn ? (
          <PremiumGate isLoggedIn={isLoggedIn} totalProjects={total} context="vacancies" />
        ) : (
          <div className={styles.registerGate}>
            <div className={styles.registerGateBlur} />
            <div className={styles.registerGateBox}>
              <span className={styles.registerGateIcon}>🚀</span>
              <h2 className={styles.registerGateTitle}>
                Ещё {(total - FREE_LIMIT).toLocaleString('ru')} вакансий ждут тебя
              </h2>
              <p className={styles.registerGateSub}>
                Зарегистрируйся бесплатно — единый премиум открывает доступ и к вакансиям, и ко всем фриланс-проектам.
              </p>
              <div className={styles.registerGatePerks}>
                <span>✓ Регистрация бесплатна</span>
                <span>✓ Подписка от {getPrice('ru').final} ₽{getPrice('ru').discountActive && <b style={{ color: '#f97316' }}> (−{getPrice('ru').discountPercent}%)</b>}</span>
                <span>✓ Все вакансии RU + мир</span>
                <span>✓ Плюс все фриланс-проекты</span>
              </div>
              <div className={styles.registerGateBtns}>
                <a href="/register" className={styles.registerGatePrimary}>Зарегистрироваться бесплатно</a>
                <a href="/login" className={styles.registerGateSecondary}>Уже есть аккаунт? Войти</a>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
