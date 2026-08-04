'use client';
import { useEffect } from 'react';

// Подстраховка на случай, если Supabase из-за несовпадения redirectTo с
// allowlist в Dashboard (или неверно заданной NEXT_PUBLIC_SITE_URL на
// хостинге) откатится на дефолтный Site URL вместо /reset-password —
// тогда токен восстановления пароля (#access_token=...&type=recovery)
// прилетает на какую-то другую страницу (обычно главную) и там просто
// пропадает, потому что её код его не ждёт и не обрабатывает.
// Этот компонент стоит в корневом layout — значит отработает на любой
// странице сайта, куда бы Supabase токен ни закинул.
export function RecoveryTokenGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/reset-password') return; // уже там

    const hash = window.location.hash;
    if (hash.includes('type=recovery') && hash.includes('access_token=')) {
      window.location.replace(`/reset-password${hash}`);
    }
  }, []);

  return null;
}
