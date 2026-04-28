'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectCard } from './ProjectCard';
import { SearchBar } from './SearchBar';
import { AdSlot, YandexAdSlot } from './AdSlot';
import { ApplicationMotivator } from './ApplicationMotivator';
import { WelcomeBackBanner } from './WelcomeBackBanner';
import { PremiumGate } from './PremiumGate';
import styles from './ProjectsFeed.module.css';

const FREE_LIMIT = 5;
const AD_EVERY = 5; // рекламный блок каждые N карточек

export function ProjectsFeed({ initialProjects = [], total = 0, isLoggedIn = false, profile = null }) {
  const params = useSearchParams();
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProjects.length < total);
  const lastChecked = useRef(new Date().toISOString());
  const loaderRef = useRef(null);
  const [feedAds, setFeedAds] = useState([]);

  // ── Проверка премиума (нужна выше потому что используется в useEffect'ах) ──
  // Премиум = is_premium=true И premium_until ещё не прошёл
  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );
  const hasFullAccess = isPremium; // только премиум видит всё

  // Загружаем рекламу для ленты
  useEffect(() => {
    fetch('/api/admin/ads?position=feed&active=1')
      .then(r => r.json())
      .then(d => setFeedAds(d.ads || []))
      .catch(() => {});
  }, []);

  // Автоприменение роли из профиля — если URL чистый и у юзера есть user_role,
  // мягко перенаправляем на /?role=X (чтобы и URL отражал фильтр, и SSR/клиент не спорили).
  // Один раз на маунт. Если пользователь сам убрал фильтр — второй раз не вставляется,
  // т.к. next.toString() при сбросе содержит empty и эффект не сработает.
  useEffect(() => {
    if (!profile?.user_role) return;
    const hasAnyFilter = params.get('role') || params.get('category')
      || params.get('source') || params.get('search');
    if (hasAnyFilter) return;
    // Проверяем sessionStorage чтобы не навязывать роль повторно после того как юзер её снял
    try {
      if (sessionStorage.getItem('role_dismissed') === '1') return;
    } catch {}
    const next = new URLSearchParams(params.toString());
    next.set('role', profile.user_role);
    router.replace(`/?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const source   = params.get('source')   || '';
  const category = params.get('category') || '';
  const role     = params.get('role')     || '';
  const search   = params.get('search')   || '';
  const region   = params.get('region')   || 'ru'; // default: Russian

  function setRegion(r) {
    const next = new URLSearchParams(params.toString());
    next.set('region', r);
    next.delete('source'); // reset source filter when switching region
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  useEffect(() => {
    setProjects([]);
    setPage(1);
    setHasMore(true);
    setNewCount(0);
    fetchPage(1, true);
  }, [source, category, role, search, region]);

  async function fetchPage(pageNum, replace = false) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: pageNum, limit: 20 });
      if (source)   qs.set('source', source);
      if (category) qs.set('category', category);
      if (role)     qs.set('role', role);
      if (search)   qs.set('search', search);
      if (!source)  qs.set('region', region); // region only when no specific source
      
      const res  = await fetch(`/api/projects?${qs}`);
      const data = await res.json();

      setProjects(prev => replace ? data.projects : [...prev, ...data.projects]);
      setHasMore(pageNum < data.pages);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  }

  // Infinite scroll — только премиум
  useEffect(() => {
    if (!hasFullAccess) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, hasFullAccess]);

  // Live updates — только премиум (показ "+N новых")
  useEffect(() => {
    if (!hasFullAccess) return;
    const interval = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ since: lastChecked.current, limit: 50 });
        if (source)   qs.set('source', source);
        if (category) qs.set('category', category);
        if (!source)  qs.set('region', region);

        const res  = await fetch(`/api/projects?${qs}`);
        const data = await res.json();

        if (data.projects?.length > 0) {
          lastChecked.current = new Date().toISOString();
          setNewCount(c => c + data.projects.length);
        }
      } catch (_) {}
    }, 10_000);
    return () => clearInterval(interval);
  }, [source, category, region, hasFullAccess]);

  function loadNewProjects() {
    setPage(1);
    fetchPage(1, true);
    setNewCount(0);
    lastChecked.current = new Date().toISOString();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Премиум / лимит ──
  const visibleProjects = hasFullAccess ? projects : projects.slice(0, FREE_LIMIT);
  // Анониму показываем register-gate, не-премиум залогиненному — premium-gate
  const showRegisterGate = !isLoggedIn && projects.length > FREE_LIMIT;
  const showPremiumGate = isLoggedIn && !isPremium && projects.length > FREE_LIMIT;

  return (
    <div className={styles.feed}>
      {/* Region tabs */}
      <div className={styles.regionTabs}>
        <button
          className={`${styles.regionTab} ${region === 'ru' ? styles.regionTabActive : ''}`}
          onClick={() => setRegion('ru')}
        >
          🇷🇺 Российские биржи
        </button>
        <button
          className={`${styles.regionTab} ${region === 'int' ? styles.regionTabActive : ''}`}
          onClick={() => setRegion('int')}
        >
          🌐 Зарубежные биржи
        </button>
      </div>

      <SearchBar />

      {hasFullAccess && <WelcomeBackBanner />}
      {hasFullAccess && <ApplicationMotivator />}

      {hasFullAccess && newCount > 0 && (
        <button className={styles.newBadge} onClick={loadNewProjects}>
          <span className={styles.newDot} />
          {newCount} новых проектов — нажми, чтобы обновить
        </button>
      )}

      <div className={styles.grid}>
        {visibleProjects.map((p, i) => (
          <React.Fragment key={p.id}>
            <ProjectCard
              project={p}
              profile={profile}
              style={{ animationDelay: `${Math.min(i % 20, 10) * 40}ms` }}
            />
            {/* Рекламный блок каждые AD_EVERY карточек */}
            {(i + 1) % AD_EVERY === 0 && (
              feedAds.length > 0
                ? <AdSlot ad={feedAds[Math.floor(i / AD_EVERY) % feedAds.length]} />
                : <YandexAdSlot blockId={process.env.NEXT_PUBLIC_YANDEX_RTB_FEED} />
            )}
          </React.Fragment>
        ))}
      </div>

      {showRegisterGate && (
        <div className={styles.registerGate}>
          <div className={styles.registerGateBlur} />
          <div className={styles.registerGateBox}>
            <span className={styles.registerGateIcon}>🚀</span>
            <h2 className={styles.registerGateTitle}>
              Ещё {total - FREE_LIMIT > 0 ? (total - FREE_LIMIT).toLocaleString('ru') : '...'} проектов ждут тебя
            </h2>
            <p className={styles.registerGateSub}>
              Зарегистрируйся бесплатно — это первый шаг. Премиум подписка открывает доступ ко всем проектам.
            </p>
            <div className={styles.registerGatePerks}>
              <span>✓ Регистрация бесплатна</span>
              <span>✓ Подписка от 149 ₽ в месяц</span>
              <span>✓ Все проекты со всех бирж</span>
              <span>✓ AI-отклики и Telegram-уведомления</span>
            </div>
            <div className={styles.registerGateBtns}>
              <a href="/register" className={styles.registerGatePrimary}>Зарегистрироваться бесплатно</a>
              <a href="/login" className={styles.registerGateSecondary}>Уже есть аккаунт? Войти</a>
            </div>
          </div>
        </div>
      )}

      {showPremiumGate && (
        <PremiumGate isLoggedIn={true} totalProjects={total} />
      )}

      {hasFullAccess && (
        <div ref={loaderRef} className={styles.loader}>
          {loading && (
            <div className={styles.spinner}>
              {[0,1,2].map(i => (
                <span key={i} className={styles.spinnerDot} style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
          {!hasMore && projects.length > 0 && (
            <p className={styles.endMsg}>Все проекты загружены</p>
          )}
        </div>
      )}
    </div>
  );
}
