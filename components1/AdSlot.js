'use client';
import { useEffect, useState } from 'react';
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

export function AdSlot({ ad }) {
  const hide = useHideForPremium();
  if (hide) return null;
  if (!ad) return null;

  function handleClick() {
    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ad.id }),
    }).catch(() => {});
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
  const containerId = `yandex_rtb_${blockId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hide) return; // премиуму — не загружаем
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
  }, [blockId, containerId, hide]);

  if (hide) return null;
  if (!blockId) return null;

  return (
    <div className={styles.ad}>
      <div className={styles.badge}>Реклама</div>
      <div id={containerId} className={styles.yandex} />
    </div>
  );
}
