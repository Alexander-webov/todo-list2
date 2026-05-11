'use client';
import { useEffect, useState } from 'react';
import styles from './RightSidebar.module.css';
import adStyles from './AdSlot.module.css';
import { YandexAdSlot } from './AdSlot';
import { ArticleOfDay } from './ArticleOfDay';
import { DonationBanner } from './DonationBanner';

export function RightSidebar() {
  const [sidebarAd, setSidebarAd] = useState(null);

  useEffect(() => {
    fetch('/api/admin/ads?position=sidebar&active=1')
      .then(r => r.json())
      .then(d => { if (d.ads?.length) setSidebarAd(d.ads[0]); })
      .catch(() => { });
  }, []);

  return (
    <aside className={styles.rightSidebar}>
      {/* Telegram-каналы */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>📢 Telegram-каналы</p>
        <div className={styles.tgList}>
          <a
            href="https://t.me/allfreelancershere_feed"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.tgItem} ${styles.tgItemRu}`}
          >
            <span className={styles.tgFlag}>🇷🇺</span>
            <span className={styles.tgLabel}>Лучшие заказы РФ</span>
            <span className={styles.tgArrow}>→</span>
          </a>
          {/*  <a
            href="https://t.me/allfreelancershere_feed_int"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.tgItem} ${styles.tgItemInt}`}
          >
            <span className={styles.tgFlag}>🌐</span>
            <span className={styles.tgLabel}>Лучшие заказы INT</span>
            <span className={styles.tgArrow}>→</span>
          </a> */}

        </div>
      </div>

      {/* Рекламный блок */}
      {sidebarAd ? (
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
      ) : (
        <div className={styles.adPlaceholder}>
          <span className={styles.adBadge}>Реклама</span>
          <YandexAdSlot blockId={process.env.NEXT_PUBLIC_YANDEX_RTB_SIDEBAR} />
        </div>
      )}

      {/* Поддержка проекта */}
      {/*   <DonationBanner /> */}

      {/* Статья дня */}
      <ArticleOfDay />
      <div className={styles.contact}>
        <p>Не нашёл ответ на свой вопрос? (programm.aleks@gmail.com)</p>
        <a href="mailto:programm.aleks@gmail.com" className={styles.contactBtn}>
          Написать в поддержку
        </a>
      </div>
    </aside>
  );
}
