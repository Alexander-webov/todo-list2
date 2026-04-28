import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { GoToProjectButton } from '@/components/GoToProjectButton';
import styles from './project.module.css';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

const SOURCE_NAMES = {
  freelancer: 'Freelancer.com', fl: 'FL.ru',
  upwork: 'Upwork', peopleperhour: 'PeoplePerHour',
  guru: 'Guru.com',
};

const CATEGORY_RU = {
  'WordPress / Tilda / CMS': 'WordPress / Tilda / CMS',
  'Видеомонтаж': 'Видеомонтаж',
  'Графический дизайн': 'Графический дизайн',
  'Web дизайн': 'Web дизайн',
  'SMM': 'SMM',
  'Парсинг': 'Парсинг',
  'Вёрстка': 'Вёрстка',
  'FrontEnd': 'FrontEnd',
  'BackEnd': 'BackEnd',
  'Другое': 'Другое',
};

const CATEGORY_SLUGS = {
  'WordPress / Tilda / CMS': 'wordpress-tilda-cms',
  'Видеомонтаж': 'videomontazh',
  'Графический дизайн': 'graficheskij-dizajn',
  'Web дизайн': 'web-dizajn',
  'SMM': 'smm',
  'Парсинг': 'parsing',
  'Вёрстка': 'verstka',
  'FrontEnd': 'frontend',
  'BackEnd': 'backend',
};

const SOURCE_SLUGS = {
  freelancer: 'freelancer',
  fl: 'fl-ru',
  kwork: 'kwork',
  freelanceru: 'freelanceru',
  upwork: 'upwork',
  peopleperhour: 'peopleperhour',
  guru: 'guru',
};

export async function generateMetadata({ params }) {
  const db = supabaseAdmin();
  const { data } = await db.from('projects').select('title, description, source, category, budget_min, currency').eq('id', params.id).single();
  if (!data) return { title: 'Проект не найден' };

  const source = SOURCE_NAMES[data.source] || data.source;
  const budget = data.budget_min
    ? ` — бюджет от ${data.budget_min.toLocaleString('ru')} ${data.currency === 'USD' ? '$' : '₽'}`
    : '';

  return {
    title: `${data.title} | ${source}${budget}`,
    description: `${data.description?.slice(0, 150) || data.title} — заказ на ${source}. Найдено через FreelanceHere — агрегатор фриланс-проектов.`,
    openGraph: {
      title: data.title,
      description: data.description?.slice(0, 150),
      type: 'article',
    },
    alternates: {
      canonical: `${SITE_URL}/projects/${params.id}`,
    },
  };
}

export default async function ProjectPage({ params }) {
  const db = supabaseAdmin();
  const { data: project } = await db.from('projects').select('*').eq('id', params.id).single();
  if (!project) notFound();

  const url = project.referral_url || project.url;
  const source = SOURCE_NAMES[project.source] || project.source;
  const categoryRu = CATEGORY_RU[project.category] || project.category;
  const categorySlug = CATEGORY_SLUGS[project.category];
  const sourceSlug = SOURCE_SLUGS[project.source];

  // Schema.org JobPosting
  const jobSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: project.title,
    description: project.description || project.title,
    datePosted: project.published_at || project.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: source,
      sameAs: url,
    },
    jobLocationType: 'TELECOMMUTE',
    employmentType: 'CONTRACTOR',
    ...(project.budget_min && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: project.currency || 'RUB',
        value: { '@type': 'QuantitativeValue', value: project.budget_min, unitText: 'FIXED' },
      },
    }),
  };

  // Хлебные крошки Schema.org
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      categorySlug && { '@type': 'ListItem', position: 2, name: categoryRu, item: `${SITE_URL}/category/${categorySlug}` },
      { '@type': 'ListItem', position: categorySlug ? 3 : 2, name: project.title, item: `${SITE_URL}/projects/${project.id}` },
    ].filter(Boolean),
  };

  return (
    <div className={styles.page}>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className={styles.container}>
        {/* Хлебные крошки */}
        <nav className={styles.breadcrumbs}>
          <a href="/" className={styles.breadcrumb}>Главная</a>
          <span className={styles.breadcrumbSep}>→</span>
          {categorySlug && (
            <>
              <a href={`/category/${categorySlug}`} className={styles.breadcrumb}>{categoryRu}</a>
              <span className={styles.breadcrumbSep}>→</span>
            </>
          )}
          <span className={styles.breadcrumbCurrent}>{project.title.slice(0, 40)}...</span>
        </nav>

        <div className={styles.card}>
          <div className={styles.meta}>
            <a href={`/source/${sourceSlug}`} className={styles.source}>{source}</a>
            {project.category && (
              <a href={categorySlug ? `/category/${categorySlug}` : '#'} className={styles.category}>
                {categoryRu}
              </a>
            )}
            {project.published_at && (
              <span className={styles.date}>
                {format(new Date(project.published_at), 'd MMMM yyyy', { locale: ru })}
              </span>
            )}
          </div>

          <h1 className={styles.title}>{project.title}</h1>

          {project.budget_min && (
            <div className={styles.budget}>
              💰 от {project.budget_min.toLocaleString('ru')} {project.currency === 'USD' ? '$' : '₽'}
              {project.budget_max && ` — до ${project.budget_max.toLocaleString('ru')} ${project.currency === 'USD' ? '$' : '₽'}`}
            </div>
          )}

          {project.description && (
            <div className={styles.description}>
              <h2 className={styles.descTitle}>Описание проекта</h2>
              <p>{project.description}</p>
            </div>
          )}

          {project.tags?.length > 0 && (
            <div className={styles.tags}>
              {project.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          <GoToProjectButton
            projectId={project.id}
            url={url}
            source={source}
            className={styles.cta}
          />
        </div>

        {/* Блок для незарегиненных */}
        <div className={styles.promo}>
          <p>📬 Хочешь получать такие проекты первым в Telegram?</p>
          <a href="/register" className={styles.promoBtn}>Зарегистрироваться бесплатно</a>
        </div>

        {/* Внутренняя перелинковка */}
        <div className={styles.links}>
          {categorySlug && (
            <a href={`/category/${categorySlug}`} className={styles.linkCard}>
              📂 Все заказы по теме «{categoryRu}»
            </a>
          )}
          {sourceSlug && (
            <a href={`/source/${sourceSlug}`} className={styles.linkCard}>
              🔗 Все заказы с {source}
            </a>
          )}
          <a href="/blog/kak-napisat-otklik-na-freelanse" className={styles.linkCard}>
            ✍️ Как написать отклик который прочитают
          </a>
        </div>
      </div>
    </div>
  );
}
