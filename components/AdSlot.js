'use client';
import { useEffect, useState, useRef } from 'react';
import styles from './AdSlot.module.css';

// Глобальный кеш premium-статуса в окне — один запрос на всю страницу,
// независимо от количества AdSlot/YandexAdSlot
let cachedPremium = null; // null=не загружено, true/false=ответ
let pendingPromise = null;

function fetchPremiumStatus() {
  if (cachedPremium !== null) return Promise.resolve(cachedPremium);
  if (pendingPromise) return pendingPromise;
  pendingPromise = fetch('/api/profile/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) {
        cachedPremium = false;
        return false;
      }
      const active = !!data.is_premium && (
        !data.premium_until || new Date(data.premium_until) > new Date()
      );
      cachedPremium = active;
      return active;
    })
    .catch(() => {
      cachedPremium = false;
      return false;
    })
    .finally(() => { pendingPromise = null; });
  return pendingPromise;
}

// Хук, скрывающий рекламу для премиум-пользователей
function useHideForPremium() {
  const [hide, setHide] = useState(cachedPremium === true);
  useEffect(() => {
    if (cachedPremium === true) { setHide(true); return; }
    if (cachedPremium === false) return;
    fetchPremiumStatus().then(isPremium => {
      if (isPremium) setHide(true);
    });
  }, []);
  return hide;
}

// Глобальный кеш флага «реклама Яндекса включена» — один запрос на страницу
let cachedYandexEnabled = null;
let yandexPending = null;
function fetchYandexEnabled() {
  if (cachedYandexEnabled !== null) return Promise.resolve(cachedYandexEnabled);
  if (yandexPending) return yandexPending;
  yandexPending = fetch('/api/settings')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      cachedYandexEnabled = d ? d.yandex_ads_enabled !== false : true;
      return cachedYandexEnabled;
    })
    .catch(() => {
      cachedYandexEnabled = true; // при ошибке — считаем включённой
      return true;
    })
    .finally(() => { yandexPending = null; });
  return yandexPending;
}

// Хук: включена ли реклама Яндекса (управляется из админки)
export function useYandexAdsEnabled() {
  const [enabled, setEnabled] = useState(cachedYandexEnabled === null ? true : cachedYandexEnabled);
  useEffect(() => {
    if (cachedYandexEnabled !== null) { setEnabled(cachedYandexEnabled); return; }
    fetchYandexEnabled().then(setEnabled);
  }, []);
  return enabled;
}

// То же самое для Google — отдельный переключатель в админке, независимый
// от Яндекса. Тянем оба флага одним запросом к /api/settings.
let cachedGoogleEnabled = null;
let googlePending = null;
function fetchGoogleEnabled() {
  if (cachedGoogleEnabled !== null) return Promise.resolve(cachedGoogleEnabled);
  if (googlePending) return googlePending;
  googlePending = fetch('/api/settings')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      cachedGoogleEnabled = d ? d.google_ads_enabled !== false : true;
      return cachedGoogleEnabled;
    })
    .catch(() => {
      cachedGoogleEnabled = true;
      return true;
    })
    .finally(() => { googlePending = null; });
  return googlePending;
}

export function useGoogleAdsEnabled() {
  const [enabled, setEnabled] = useState(cachedGoogleEnabled === null ? true : cachedGoogleEnabled);
  useEffect(() => {
    if (cachedGoogleEnabled !== null) { setEnabled(cachedGoogleEnabled); return; }
    fetchGoogleEnabled().then(setEnabled);
  }, []);
  return enabled;
}

export function AdSlot({ ad }) {
  const hide = useHideForPremium();
  if (hide) return null;
  if (!ad) return null;

  function handleClick() {
    // серверный счётчик кликов
    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ad.id }),
    }).catch(() => { });
    // цель в Метрику — чтобы видеть клики по рекламе в воронке рядом с трафиком
    if (typeof window !== 'undefined' && window.ym) {
      const mid = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (mid) window.ym(mid, 'reachGoal', 'ad_click');
    }
  }

  return (
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={styles.ad}
      onClick={handleClick}
    >
      <div className={styles.badge}>Реклама</div>
      <div className={styles.content}>
        {ad.image_url && (
          <img src={ad.image_url} alt="" className={styles.image} />
        )}
        <div className={styles.text}>
          <p className={styles.title}>{ad.title}</p>
          {ad.description && (
            <p className={styles.desc}>{ad.description}</p>
          )}
          <span className={styles.cta}>Подробнее →</span>
        </div>
      </div>
    </a>
  );
}

export function YandexAdSlot({ blockId }) {
  const hide = useHideForPremium();
  const yandexEnabled = useYandexAdsEnabled();
  const containerId = `yandex_rtb_${blockId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!yandexEnabled) return;
    if (!blockId) return;

    // Ждём загрузки скрипта context.js
    const tryRender = () => {
      if (window.Ya?.Context?.AdvManager) {
        window.Ya.Context.AdvManager.render({
          blockId,
          renderTo: containerId,
        });
      } else if (window.yaContextCb) {
        window.yaContextCb.push(() => {
          window.Ya.Context.AdvManager.render({
            blockId,
            renderTo: containerId,
          });
        });
      }
    };

    // Даём скрипту время загрузиться
    const timer = setTimeout(tryRender, 1000);
    return () => clearTimeout(timer);
  }, [blockId, containerId, hide, yandexEnabled]);

  if (hide) return null;
  if (!yandexEnabled) return null; // выключено из админки
  if (!blockId) return null;

  return (
    <div className={styles.ad}>
      <div className={styles.badge}>Реклама</div>
      <div id={containerId} className={styles.yandex} />
    </div>
  );
}

// GoogleAdSlot — реклама через Google AdSense. ВАЖНО: в отличие от
// YandexAdSlot, здесь сознательно НЕТ useHideForPremium() — по явной
// просьбе показывать эту рекламу вообще всем пользователям, включая
// премиум (аудитория сайта международная, Google платит стабильнее и
// больше, чем Яндекс, для не-РФ трафика).
// Нужен NEXT_PUBLIC_ADSENSE_CLIENT_ID (вида "ca-pub-XXXXXXXXXXXXXXXX") —
// это твой ID из аккаунта Google AdSense, его надо завести и получить
// одобрение отдельно, я не могу создать аккаунт или сгенерировать ID сам.
// slot — это ID конкретного рекламного блока внутри AdSense (создаётся
// там же, в разделе "Объявления" → "По код объявления").
export function GoogleAdSlot({ slot, format = 'auto' }) {
  const googleEnabled = useGoogleAdsEnabled();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!googleEnabled || !clientId || !slot) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // adsbygoogle.js мог ещё не успеть загрузиться — не критично,
      // при следующем ререндере компонента попытка не повторится намеренно
      // (чтобы не плодить push() на один и тот же <ins>), это нормально
      // для AdSense — он сам подхватывает блоки после загрузки скрипта.
    }
  }, [googleEnabled, clientId, slot]);

  if (!googleEnabled) return null; // выключено из админки
  if (!clientId || !slot) return null; // не настроено — не рендерим пустой блок

  return (
    <div className={styles.ad}>
      <div className={styles.badge}>Реклама</div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
