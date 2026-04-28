'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import styles from '../login/auth.module.css';
import { ROLES } from '@/lib/roles';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Подхватываем реферальный код из URL ?ref=xxxx
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    if (!userRole) { setError('Выбери, кем ты работаешь — так мы подберём проекты под тебя'); return; }
    setLoading(true);
    setError('');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message.includes('already registered')
        ? 'Этот email уже зарегистрирован' : signUpError.message);
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError('Подтверди email — заказы уже ждут тебя.');
      setLoading(false);
      return;
    }

    // Сохраняем роль в профиле
    try {
      await fetch('/api/profile/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_role: userRole }),
      });
    } catch (_) {}

    // Применяем реферальный код если есть
    if (refCode) {
      await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: refCode }),
      });
    }

    window.location.href = '/';
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <a href="/" className={styles.logo}>⚡ allFreelancersHere</a>
        <h1 className={styles.title}>Регистрация</h1>
        {refCode && (
          <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13, color: '#a78bfa' }}>
            🎁 Реферальный код применится автоматически!
          </div>
        )}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Кто ты?</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8,
            }}>
              {ROLES.map(r => {
                const active = userRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setUserRole(r.key)}
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-card)',
                      color: active ? '#fff' : 'var(--text)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{r.emoji}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
              Будем показывать проекты, которые подходят именно тебе
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" required className={styles.input}
              placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Пароль</label>
            <input type="password" required className={styles.input}
              placeholder="Минимум 6 символов" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          {!refCode && (
            <div className={styles.field}>
              <label className={styles.label}>Реферальный код (если есть)</label>
              <input type="text" className={styles.input}
                placeholder="Например: abc12345" value={refCode}
                onChange={e => setRefCode(e.target.value)} />
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Создаём...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className={styles.footer}>
          Уже есть аккаунт? <Link href="/login" className={styles.link}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
