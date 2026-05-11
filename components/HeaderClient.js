'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import styles from './Header.module.css';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/', label: 'Проекты' },
  { href: '/partners', label: 'Все биржи' },
  { href: '/blog', label: 'Блог' },
  { href: '/faq', label: 'FAQ' },
];

export function HeaderClient({ user, isAdmin }) {
  const pathname = usePathname();
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

  const username = user?.email?.split('@')[0] || '';

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <div className={styles.leftGroup}>
          <a href="/" className={styles.logo} aria-label="AllFreelancersHere">
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>
              <span className={styles.logoAll}>All</span>
              <span className={styles.logoFreelancers}>Freelancers</span>
              <span className={styles.logoHere}>Here</span>
            </span>
          </a>
          {/*           <div className={styles.themeWrap}>
            <ThemeToggle />
          </div> */}
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                {item.label}
              </a>
            );
          })}
          {isAdmin && (
            <a
              href="/admin"
              className={`${styles.navLink} ${pathname?.startsWith('/admin') ? styles.navLinkActive : ''}`}
            >
              Админ
            </a>
          )}

        </nav>

        <div className={styles.actions}>
          {user ? (
            <>
              <a href="/settings" className={styles.settingsLink}>🎯 Настройка</a>
              <a href="/dashboard" className={styles.btnGhost}>{username}</a>
              <button className={styles.btnOutline} onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <a href="/register" className={styles.btnGhost}>Регистрация</a>
              <a href="/login" className={styles.btnPrimary}>Войти</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
