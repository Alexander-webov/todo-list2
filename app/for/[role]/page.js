export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';
import { ROLE_SEO, ROLES, roleSeoBySlug, categoriesForRole } from '@/lib/roles';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import styles from './role.module.css';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

export async function generateMetadata({ params }) {
  const role = roleSeoBySlug(params.role);
  if (!role) return { title: 'Не найдено' };
  return {
    title: role.metaTitle,
    description: role.metaDescription,
    keywords: role.keywords,
    alternates: { canonical: `${SITE_URL}/for/${role.key}` },
    openGraph: {
      title: role.metaTitle,
      description: role.metaDescription,
      url: `${SITE_URL}/for/${role.key}`,
      type: 'website',
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(ROLE_SEO).map(role => ({ role }));
}

const SOURCE_NAMES = {
  fl: 'FL.ru',
  kwork: 'Kwork',
  freelanceru: 'Freelance.ru',
  youdo: 'Youdo',
  freelancer: 'Freelancer.com',
  peopleperhour: 'PeoplePerHour',
  guru: 'Guru.com',
  upwork: 'Upwork',
};

export default async function RolePage({ params }) {
  const role = roleSeoBySlug(params.role);
  if (!role) notFound();

  const db = supabaseAdmin();
  const cats = categoriesForRole(role.key);

  // Проекты роли (из всех мапящихся категорий)
  const { data: projects, count } = await db
    .from('projects')
    .select('*', { count: 'exact' })
    .in('category', cats.length > 0 ? cats : ['___none___'])
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.emoji}>{role.emoji}</span>
          <h1 className={styles.title}>{role.h1}</h1>
          <p className={styles.desc}>{role.heroText}</p>
          <div className={styles.stats}>
            <span>📋 {(count || 0).toLocaleString('ru')} актуальных заказов</span>
            <span>⚡ Обновляется каждую минуту</span>
          </div>
          <div className={styles.ctaRow}>
            <Link href={`/?role=${role.key}`} className={styles.ctaPrimary}>
              Смотреть все заказы →
            </Link>
            <Link href="/register" className={styles.ctaSecondary}>
              Регистрация — 10 сек
            </Link>
          </div>
        </div>

        {/* Навигация по ролям */}
        <nav className={styles.roleNav} aria-label="Другие профессии">
          {ROLES.map(r => (
            <Link
              key={r.key}
              href={`/for/${r.key}`}
              className={`${styles.roleLink} ${r.key === role.key ? styles.roleLinkActive : ''}`}
            >
              <span>{r.emoji}</span> {r.label}
            </Link>
          ))}
        </nav>

        {/* Перки */}
        <section className={styles.perks}>
          <h2 className={styles.sectionH2}>Почему удобнее искать заказы у нас</h2>
          <div className={styles.perksGrid}>
            {role.perks.map((p, i) => (
              <div key={i} className={styles.perkCard}>
                <div className={styles.perkEmoji}>{p.emoji}</div>
                <div className={styles.perkTitle}>{p.title}</div>
                <div className={styles.perkDesc}>{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Список проектов */}
        <section>
          <h2 className={styles.sectionH2}>Последние заказы · {role.label.toLowerCase()}</h2>
          <div className={styles.list}>
            {(projects || []).length === 0 && (
              <div className={styles.empty}>
                Заказы загружаются. Загляни через пару минут или открой ленту целиком.
              </div>
            )}
            {(projects || []).map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className={styles.item}>
                <div className={styles.itemTop}>
                  <span className={styles.source}>{SOURCE_NAMES[p.source] || p.source}</span>
                  {p.category && <span className={styles.categoryTag}>{p.category}</span>}
                  <span className={styles.date}>
                    {p.published_at
                      ? format(new Date(p.published_at), 'd MMM', { locale: ru })
                      : format(new Date(p.created_at), 'd MMM', { locale: ru })}
                  </span>
                </div>
                <h3 className={styles.itemTitle}>{p.title}</h3>
                {p.description && (
                  <p className={styles.itemDesc}>{p.description.slice(0, 160)}…</p>
                )}
                {p.budget_min && (
                  <span className={styles.budget}>
                    от {Number(p.budget_min).toLocaleString('ru')} {p.currency === 'USD' ? '$' : '₽'}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {(projects || []).length > 0 && (
            <div className={styles.loadMore}>
              <Link href={`/?role=${role.key}`} className={styles.ctaPrimary}>
                Открыть все заказы в ленте →
              </Link>
            </div>
          )}
        </section>

        {/* Финальный CTA */}
        <section className={styles.cta}>
          <h2>Получай новые заказы первым</h2>
          <p>
            Подключи уведомления в Telegram — новые заказы для {role.label.toLowerCase()}
            {'а'} приходят сразу как появляются на биржах. Откликайся пока нет конкуренции.
          </p>
          <Link href="/register" className={styles.ctaBtn}>
            Зарегистрироваться бесплатно →
          </Link>
        </section>
      </div>
    </div>
  );
}
