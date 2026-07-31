export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';
import { VACANCY_CATEGORY_SEO } from '@/lib/vacancyCategories';
import { VACANCY_SOURCES } from '@/lib/vacancySources';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { VacancyCard } from '@/components/VacancyCard';
import styles from '../remote-work.module.css';
import catStyles from './category.module.css';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

export async function generateMetadata({ params }) {
  const cat = VACANCY_CATEGORY_SEO[params.category];
  if (!cat) return { title: 'Не найдено' };
  return {
    title: `Удалённая работа: ${cat.name} — вакансии RU и мир | FreelanceHere`,
    description: cat.description,
    alternates: { canonical: `${SITE_URL}/remote-work/${params.category}` },
  };
}

export async function generateStaticParams() {
  return Object.keys(VACANCY_CATEGORY_SEO).map(category => ({ category }));
}

export default async function RemoteWorkCategoryPage({ params }) {
  const cat = VACANCY_CATEGORY_SEO[params.category];
  if (!cat) notFound();

  const db = supabaseAdmin();
  const { data: vacancies, count } = await db
    .from('vacancies')
    .select('*', { count: 'planned' })
    .eq('category', cat.dbCategory)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(30);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Удалённая работа', item: `${SITE_URL}/remote-work` },
      { '@type': 'ListItem', position: 3, name: cat.name, item: `${SITE_URL}/remote-work/${params.category}` },
    ],
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>{cat.emoji} Удалённая работа: {cat.name}</h1>
          <p className={styles.desc}>{cat.description}</p>
          <div className={catStyles.stats}>
            <span>📋 {count || 0} вакансий</span>
            <span>🇷🇺 HH.ru, Avito, Работа России · 🌍 RemoteOK, WeWorkRemotely, Remotive</span>
          </div>
        </div>

        <nav className={catStyles.catNav} aria-label="Другие категории">
          {Object.entries(VACANCY_CATEGORY_SEO).map(([slug, c]) => (
            <Link
              key={slug}
              href={`/remote-work/${slug}`}
              className={`${catStyles.catLink} ${slug === params.category ? catStyles.catLinkActive : ''}`}
            >
              {c.emoji} {c.name}
            </Link>
          ))}
        </nav>

        <div className={catStyles.list}>
          {(vacancies || []).length === 0 && (
            <div className={catStyles.empty}>Вакансии в этой категории загружаются — загляни чуть позже.</div>
          )}
          {(vacancies || []).map(v => (
            <VacancyCard key={v.id} vacancy={v} />
          ))}
        </div>

        <div className={catStyles.ctaRow}>
          <Link href="/remote-work" className={catStyles.ctaSecondary}>← Все категории и регионы</Link>
        </div>
      </div>
    </div>
  );
}
