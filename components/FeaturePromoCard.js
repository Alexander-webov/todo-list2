import styles from './FeaturePromoCard.module.css';

export function FeaturePromoCard({ icon, title, text, ctaText, ctaHref, accent = 'purple' }) {
  return (
    <a href={ctaHref} className={`${styles.card} ${styles[accent]}`}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{text}</p>
      </div>
      <span className={styles.cta}>{ctaText} →</span>
    </a>
  );
}
