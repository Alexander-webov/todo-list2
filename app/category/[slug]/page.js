export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORY_SEO } from '@/lib/categories';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import styles from './category.module.css';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export async function generateMetadata({ params }) {
  const cat = CATEGORY_SEO[params.slug];
  if (!cat) return { title: 'Не найдено' };
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';
  return {
    title: `${cat.name} — фриланс заказы | FreelanceHere`,
    description: cat.description,
    keywords: cat.keywords,
    alternates: {
      canonical: `${SITE_URL}/category/${params.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(CATEGORY_SEO).map(slug => ({ slug }));
}

export default async function CategoryPage({ params }) {
  const cat = CATEGORY_SEO[params.slug];
  if (!cat) notFound();

  const db = supabaseAdmin();

  const { data: projects, count } = await db
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('category', cat.dbCategory)
    .order('created_at', { ascending: false })
    .limit(50);

  const SOURCE_NAMES = {
    freelancer: 'Freelancer.com', fl: 'FL.ru',
    upwork: 'Upwork', peopleperhour: 'PeoplePerHour',
    guru: 'Guru.com',
  };

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.emoji}>{cat.emoji}</span>
          <h1 className={styles.title}>{cat.name}</h1>
          <p className={styles.desc}>{cat.description}</p>
          <div className={styles.stats}>
            <span>📋 {count || 0} актуальных заказов</span>
            <span>⚡ Обновляется каждую минуту</span>
          </div>
        </div>

        {/* Навигация по категориям */}
        <div className={styles.catNav}>
          {Object.entries(CATEGORY_SEO).map(([slug, c]) => (
            <Link
              key={slug}
              href={`/category/${slug}`}
              className={`${styles.catLink} ${slug === params.slug ? styles.catLinkActive : ''}`}
            >
              {c.emoji} {c.name}
            </Link>
          ))}
        </div>

        {/* Список проектов */}
        <div className={styles.list}>
          {(projects || []).map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.source}>{SOURCE_NAMES[p.source] || p.source}</span>
                <span className={styles.date}>
                  {p.published_at
                    ? format(new Date(p.published_at), 'd MMM', { locale: ru })
                    : format(new Date(p.created_at), 'd MMM', { locale: ru })}
                </span>
              </div>
              <h2 className={styles.itemTitle}>{p.title}</h2>
              {p.description && (
                <p className={styles.itemDesc}>{p.description.slice(0, 120)}...</p>
              )}
              {p.budget_min && (
                <span className={styles.budget}>
                  от {p.budget_min.toLocaleString('ru')} {p.currency === 'USD' ? '$' : '₽'}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* CTA для незарегиненных */}
        <div className={styles.cta}>
          <h2>Хочешь видеть все заказы первым?</h2>
          <p>Подключи уведомления в Telegram — новые проекты по {cat.name.toLowerCase()} приходят сразу как появляются</p>
          <a href="/register" className={styles.ctaBtn}>
            Зарегистрироваться бесплатно
          </a>
        </div>
      </div>
    </div>
  );
}
