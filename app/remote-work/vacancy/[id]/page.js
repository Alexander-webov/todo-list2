import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { VACANCY_SOURCES } from '@/lib/vacancySources';
import { vacancyCategoryBySlug, VACANCY_CATEGORY_SEO } from '@/lib/vacancyCategories';
import styles from './vacancy.module.css';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

// category -> slug обратный маппинг (для внутренней перелинковки)
const CATEGORY_TO_SLUG = Object.fromEntries(
  Object.entries(VACANCY_CATEGORY_SEO).map(([slug, c]) => [c.dbCategory, slug])
);

export async function generateMetadata({ params }) {
  const db = supabaseAdmin();
  const { data: v } = await db.from('vacancies').select('title, company, description').eq('id', params.id).single();
  if (!v) return { title: 'Вакансия не найдена' };

  const title = `${v.title}${v.company ? ` — ${v.company}` : ''} — удалённая вакансия`;
  const description = (v.description || `${v.title}: актуальная удалённая вакансия. Отклик напрямую у работодателя.`).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/remote-work/vacancy/${params.id}` },
    openGraph: { title, description },
  };
}

export default async function VacancyPage({ params }) {
  const db = supabaseAdmin();
  const { data: vacancy } = await db.from('vacancies').select('*').eq('id', params.id).single();
  if (!vacancy) notFound();

  const sourceMeta = VACANCY_SOURCES[vacancy.source] || { name: vacancy.source, flag: '🌐' };
  const categorySlug = CATEGORY_TO_SLUG[vacancy.category];
  const categoryInfo = categorySlug ? vacancyCategoryBySlug(categorySlug) : null;

  // Schema.org JobPosting — раньше этого не было вообще для раздела вакансий,
  // хотя это именно тот тип контента, для которого эта разметка и придумана
  // (попадание в Google Jobs / "вакансии" в поиске).
  const jobSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: vacancy.title,
    description: vacancy.description || vacancy.title,
    datePosted: vacancy.published_at || vacancy.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: vacancy.company || sourceMeta.name,
      sameAs: vacancy.url,
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: vacancy.region === 'ru' ? 'Russia' : undefined,
    },
    employmentType: vacancy.employment_type?.toLowerCase().includes('част') ? 'PART_TIME' : 'FULL_TIME',
    ...(vacancy.salary_min && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: vacancy.currency || 'RUB',
        value: {
          '@type': 'QuantitativeValue',
          minValue: vacancy.salary_min,
          ...(vacancy.salary_max && { maxValue: vacancy.salary_max }),
          unitText: 'MONTH',
        },
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Удалённая работа', item: `${SITE_URL}/remote-work` },
      categoryInfo && { '@type': 'ListItem', position: 3, name: categoryInfo.name, item: `${SITE_URL}/remote-work/${categorySlug}` },
      { '@type': 'ListItem', position: categoryInfo ? 4 : 3, name: vacancy.title, item: `${SITE_URL}/remote-work/vacancy/${vacancy.id}` },
    ].filter(Boolean),
  };

  const salaryText = vacancy.salary_min
    ? `от ${Number(vacancy.salary_min).toLocaleString('ru')}${vacancy.salary_max ? ` до ${Number(vacancy.salary_max).toLocaleString('ru')}` : ''} ${vacancy.currency === 'USD' ? '$' : '₽'}`
    : null;

  return (
    <div className={styles.page}>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className={styles.container}>
        <nav className={styles.breadcrumbs}>
          <a href="/remote-work" className={styles.breadcrumb}>Удалённая работа</a>
          <span className={styles.breadcrumbSep}>→</span>
          {categoryInfo && (
            <>
              <a href={`/remote-work/${categorySlug}`} className={styles.breadcrumb}>{categoryInfo.name}</a>
              <span className={styles.breadcrumbSep}>→</span>
            </>
          )}
          <span className={styles.breadcrumbCurrent}>{vacancy.title.slice(0, 40)}...</span>
        </nav>

        <div className={styles.card}>
          <div className={styles.meta}>
            <span className={styles.source}>{sourceMeta.flag} {sourceMeta.name}</span>
            {categoryInfo && (
              <a href={`/remote-work/${categorySlug}`} className={styles.category}>{categoryInfo.name}</a>
            )}
            {vacancy.published_at && (
              <span className={styles.date}>
                {format(new Date(vacancy.published_at), 'd MMMM yyyy', { locale: ru })}
              </span>
            )}
          </div>

          <h1 className={styles.title}>{vacancy.title}</h1>
          {vacancy.company && <div className={styles.company}>{vacancy.company}</div>}

          {salaryText && <div className={styles.budget}>💰 {salaryText}</div>}

          {vacancy.description && (
            <div className={styles.description}>
              <h2 className={styles.descTitle}>Описание вакансии</h2>
              <p>{vacancy.description}</p>
            </div>
          )}

          {vacancy.tags?.length > 0 && (
            <div className={styles.tags}>
              {vacancy.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          <a href={vacancy.url} target="_blank" rel="noopener noreferrer sponsored" className={styles.cta}>
            Откликнуться на {sourceMeta.name} →
          </a>
        </div>

        <div className={styles.links}>
          {categoryInfo && (
            <a href={`/remote-work/${categorySlug}`} className={styles.linkCard}>
              📂 Все вакансии по теме «{categoryInfo.name}»
            </a>
          )}
          <a href="/remote-work" className={styles.linkCard}>
            🌍 Все вакансии на удалёнке
          </a>
          <a href="/blog/kak-ne-popastsya-na-skam-zakazchika" className={styles.linkCard}>
            🛡️ Как не попасться на скам-заказчика
          </a>
        </div>
      </div>
    </div>
  );
}
