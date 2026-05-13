'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import styles from './Header.module.css';

export function HeaderClient({ user, isAdmin }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function logout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>Freelance<span className={styles.logoAccent}>Hub</span></span>
        </a>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} /><span>Live</span>
        </div>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>Проекты</a>
          <a href="/partners" className={styles.navLink}>Биржи</a>
          <a href="/faq" className={styles.navLink}>FAQ</a>
          <a href="/blog" className={styles.navLink}>Блог</a>
          {isAdmin && <a href="/admin" className={styles.navLink}>Админ</a>}
        </nav>
        <div className={styles.actions}>
          {user ? (
            <>
              <a href="/dashboard" className={styles.btnOutline}>{user.email.split('@')[0]}</a>
              <button className={styles.btnOutline} onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <a href="/login" className={styles.btnOutline}>Войти</a>
              <a href="/register" className={styles.btnPrimary}>Регистрация</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
