'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import styles from '../login/auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { flowType: 'implicit' } }
    );

    await supabase.auth.signOut();

    // Явно указываем полный URL до /reset-password
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <div className={styles.successIcon}>✉️</div>
        <h1 className={styles.title}>Письмо отправлено</h1>
        <p className={styles.subtitle}>
          Проверь почту <strong>{email}</strong> и перейди по ссылке.<br />
          <small style={{ color: 'var(--text-dim)' }}>Используй только последнее письмо — ссылка одноразовая.</small>
        </p>
        <Link href="/login" className={styles.btn} style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <h1 className={styles.title}>Сброс пароля</h1>
        <p className={styles.subtitle}>Введи email — пришлём ссылку для сброса.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" required className={styles.input}
              placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Отправляем...' : 'Отправить ссылку'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link href="/login" className={styles.link}>← Назад ко входу</Link>
        </p>
      </div>
    </div>
  );
}
