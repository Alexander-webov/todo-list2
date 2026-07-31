import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Нет cookie сессии Supabase (боты, краулеры, анонимы) → НЕ дёргаем Auth.
  // Именно getUser() на каждый заход бота забивал ~900k auth-запросов/сутки и клал базу.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
  if (!hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Только для залогиненных: обновляем сессию.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // /api/ исключён отдельно: миддлварь продлевает сессию браузера
  // залогиненного юзера, API-роутам это не нужно (каждый сам читает cookie
  // через getCurrentUser()). Раньше /api/cron/* тоже проходил через эту
  // миддлварь — а на Netlify она выполняется как Edge Function с гораздо
  // более жёстким лимитом времени, чем обычная серверная функция. Крон
  // парсинга стабильно работал 20-30+ секунд — Edge-прослойка обрывала
  // ожидание с AbortError ещё до завершения реального парсинга.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
