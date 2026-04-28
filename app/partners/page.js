import { PARTNER_LINKS } from '@/lib/referrals';
import styles from './partners.module.css';

export const metadata = {
  title: 'Зарегистрируйся на фриланс-биржах — allFreelancersHere',
  description: 'Все популярные фриланс-биржи в одном месте. Регистрируйся и начинай зарабатывать.',
  alternates: {
    canonical: 'https://allfreelancershere.ru/partners',
  },
};

export default function PartnersPage() {
  return (
    <div className={styles.page}>
      <a href="/" className={styles.back}>← На главную</a>

      <div className={styles.hero}>
        <h1 className={styles.title}>Зарегистрируйся на всех биржах</h1>
        <p className={styles.sub}>
          Больше бирж = больше заказов. Зарегистрируйся один раз — и получай проекты со всех площадок прямо в allFreelancersHere.
        </p>
      </div>

      <div className={styles.grid}>
        {Object.entries(PARTNER_LINKS).map(([key, p]) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.dot} style={{ background: p.color }} />
              <span className={styles.name}>{p.name}</span>
            </div>
            <p className={styles.desc}>{p.description}</p>

            <a href={p.registerUrl} target="_blank" rel="noopener noreferrer"
              className={styles.btn} style={{ background: p.color }}>
              Зарегистрироваться на {p.name} →
            </a>
          </div>
        ))}
      </div>

      <div className={styles.promo}>
        <h2>Уже зарегистрирован на биржах?</h2>
        <p>Подключи FreelancersHere и получай все проекты в одном месте + уведомления в Telegram.</p>
        <a href="/register" className={styles.promoBtn}>Зарегистрироваться бесплатно</a>
      </div>
    </div>
  );
}
