'use client';
import { useState } from 'react';
import styles from './dashboard.module.css';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

export function DashboardClient({ profile, email, payments, paymentStatus }) {
  const [loading, setLoading] = useState(false);

  // Выход через API route — надёжнее чем клиентский signOut
  async function logout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.back}>← Назад</a>
        <button className={styles.logoutBtn} onClick={logout} disabled={loading}>
          {loading ? '...' : 'Выйти'}
        </button>
      </div>

      <div className={styles.section}>
        <h1 className={styles.sectionTitle}>Мой аккаунт</h1>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{email}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Статус</span>
            <span className={`${styles.rowValue} ${styles.premium}`}>
              ✅ Полный доступ (бесплатно)
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <Link href="/dashboard/applications" className={styles.card} style={{ display: 'block', textDecoration: 'none' }}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>📋 Мои отклики</span>
            <span className={styles.rowValue}>Посмотреть →</span>
          </div>
        </Link>
      </div>

      <div className={styles.section}>
        <Link href="/resume-builder" className={styles.card} style={{ display: 'block', textDecoration: 'none' }}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>📄 Конструктор резюме</span>
            <span className={styles.rowValue}>Открыть →</span>
          </div>
        </Link>
      </div>

      <div className={styles.section}>
        <Link href="/ai-response" className={styles.card} style={{ display: 'block', textDecoration: 'none' }}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>✨ AI-отклики</span>
            <span className={styles.rowValue}>Открыть →</span>
          </div>
        </Link>
      </div>

      {
        payments.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>История платежей</h2>
            <div className={styles.card}>
              {payments.map(p => (
                <div key={p.id} className={styles.paymentRow}>
                  <div>
                    <p className={styles.paymentName}>
                      {p.provider === 'yookassa' ? '🇷🇺 ЮKassa' : '🌍 Stripe'} · {p.days_granted} дней
                    </p>
                    <p className={styles.paymentDate}>
                      {format(new Date(p.created_at), 'd MMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  <div className={styles.paymentRight}>
                    <span className={styles.paymentAmount}>
                      {p.currency === 'RUB' ? `${p.amount} ₽` : `$${p.amount}`}
                    </span>
                    <span className={`${styles.paymentStatus} ${p.status === 'succeeded' ? styles.statusOk : styles.statusPending}`}>
                      {p.status === 'succeeded' ? 'Оплачен' : 'Ожидает'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
    </div >
  );
}
