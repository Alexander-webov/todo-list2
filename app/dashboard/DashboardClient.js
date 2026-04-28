'use client';
import { useState } from 'react';
import styles from './dashboard.module.css';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

export function DashboardClient({ profile, email, payments, paymentStatus }) {
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(profile?.telegram_chat_id || '');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgResult, setTgResult] = useState(null);

  // Выход через API route — надёжнее чем клиентский signOut
  async function logout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  async function connectTelegram(e) {
    e.preventDefault();
    setTgLoading(true);
    setTgResult(null);
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      });
      const data = await res.json();
      setTgResult(data.success
        ? { ok: true, msg: '✅ Telegram подключён! Проверь сообщение от бота.' }
        : { ok: false, msg: data.error });
    } catch {
      setTgResult({ ok: false, msg: 'Ошибка соединения' });
    } finally {
      setTgLoading(false);
    }
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
        <h2 className={styles.sectionTitle}>Telegram уведомления</h2>
        <div className={styles.card} style={{ padding: '18px' }}>
          <p className={styles.tgDesc}>Получай новые проекты прямо в Telegram.</p>
          <ol className={styles.tgSteps}>
            <li>Открой  <Link href="https://t.me/freelance_hub_premium_bot" className={styles.textLinkBot} >бота</Link> и отправь /start — он пришлёт твой Chat ID</li>
            <li>Вставь Chat ID ниже и нажми «Подключить»</li>
            <li>Для смены категории вызовите команды /categories </li>
            <li>Внимание! Мы рекомендуем оставить все категории  </li>
          </ol>
          <form className={styles.tgForm} onSubmit={connectTelegram}>
            <input type="text" className={styles.tgInput}
              placeholder="Твой Chat ID (например: 123456789)"
              value={chatId} onChange={e => setChatId(e.target.value)} required />
            <button type="submit" className={styles.tgBtn} disabled={tgLoading}>
              {tgLoading ? '...' : profile?.telegram_chat_id ? 'Обновить' : 'Подключить'}
            </button>
          </form>
          {tgResult && (
            <p className={`${styles.tgResult} ${tgResult.ok ? styles.tgOk : styles.tgErr}`}>
              {tgResult.msg}
            </p>
          )}
        </div>
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
