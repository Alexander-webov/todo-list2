'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../login/auth.module.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Используем тот же implicit flow клиент
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { flowType: 'implicit' } }
    );

    const hash = window.location.hash;
    const search = window.location.search;
    const searchParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.replace('#', ''));

    // Проверяем ошибку
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
    if (errorCode === 'otp_expired') {
      setError('Ссылка истекла. Запроси новую.');
      setChecking(false);
      return;
    }
    if (searchParams.get('error') || hashParams.get('error')) {
      setError('Ссылка недействительна. Запроси новую.');
      setChecking(false);
      return;
    }

    // Implicit flow: токен в hash
    const accessToken = hashParams.get('access_token');
    if (accessToken) {
      const refreshToken = hashParams.get('refresh_token') || '';
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setError('Ошибка: ' + error.message);
          else setReady(true);
          setChecking(false);
        });
      return;
    }

    // Слушаем событие как fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setChecking(false);
      }
    });

    const timer = setTimeout(() => {
      setError('Ссылка не найдена. Запроси новую.');
      setChecking(false);
    }, 3000);

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    setError('');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { flowType: 'implicit' } }
    );

    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else window.location.href = '/';
  }

  if (checking) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <div className={styles.successIcon}>⏳</div>
        <h1 className={styles.title}>Проверяем ссылку...</h1>
      </div>
    </div>
  );

  if (!ready) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <div className={styles.successIcon}>❌</div>
        <h1 className={styles.title}>Ссылка недействительна</h1>
        <p className={styles.subtitle}>{error}</p>
        <a href="/forgot-password" className={styles.btn}
          style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
          Запросить новую ссылку
        </a>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <h1 className={styles.title}>Новый пароль</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Новый пароль</label>
            <input type="password" required className={styles.input}
              placeholder="Минимум 6 символов" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Повтори пароль</label>
            <input type="password" required className={styles.input}
              placeholder="Повтори пароль" value={confirm}
              onChange={e => setConfirm(e.target.value)} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>
      </div>
    </div>
  );
}
