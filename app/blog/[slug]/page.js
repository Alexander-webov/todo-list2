import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import styles from './article.module.css';
import { supabaseAdmin } from '@/lib/supabase';
import { ARTICLES, ARTICLE_LIST } from '../articles-data';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

export async function generateMetadata({ params }) {
  const db = supabaseAdmin();
  const { data: dbArticle } = await db
    .from('blog_articles')
    .select('*')
    .eq('slug', params.slug)
    .single();
  const article = dbArticle || ARTICLES[params.slug];

  if (!article) return { title: 'Не найдено' };

  return {
    title: `${article.title} | FreelanceHere`,
    description: article.desc || article.description,
    keywords: article.keywords,
    alternates: {
      canonical: `${SITE_URL}/blog/${params.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.desc || article.description,
      url: `${SITE_URL}/blog/${params.slug}`,
      type: 'article',
    },
  };
}

export async function generateStaticParams() {
  return [];
}

function renderContent(content) {
  return content.trim().split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} className={styles.h2}>{line.slice(3)}</h2>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className={styles.bold}>{line.slice(2, -2)}</p>;
    if (line.startsWith('- ')) return <li key={i} className={styles.li}>{line.slice(2)}</li>;
    if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className={styles.italic}>{line.slice(1, -1)}</p>;
    if (line.trim() === '') return null;
    return <p key={i} className={styles.p}>{line}</p>;
  });
}

export default async function ArticlePage({ params }) {
  const db = supabaseAdmin();
  const { data: dbArticle } = await db
    .from('blog_articles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  const article = dbArticle || ARTICLES[params.slug];

  if (!article) notFound();

  const desc = article.desc || article.description || '';

  // Похожие статьи — из единого списка, исключая текущую
  const related = ARTICLE_LIST.filter(a => a.slug !== params.slug).slice(0, 3);

  // JSON-LD: Article — главный сигнал для Google по статьям
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: desc,
    author: { '@type': 'Organization', name: 'FreelanceHere' },
    publisher: {
      '@type': 'Organization',
      name: 'FreelanceHere',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${params.slug}` },
    datePublished: article.created_at || '2024-09-01',
    dateModified: article.updated_at || article.created_at || '2025-01-01',
  };

  // JSON-LD: хлебные крошки
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Блог', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE_URL}/blog/${params.slug}` },
    ],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />
      <div className={styles.container}>
        <a href="/blog" className={styles.back}>← Все статьи</a>

        <article className={styles.article}>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.content}>
            {renderContent(article.content)}
          </div>
        </article>

        <div className={styles.cta}>
          <h2>Попробуй FreelanceHere бесплатно</h2>
          <p>Находи заказы со всех бирж в одной ленте. Уведомления в Telegram. 7 дней бесплатно.</p>
          <a href="/register" className={styles.ctaBtn}>Зарегистрироваться бесплатно</a>
        </div>

        {related.length > 0 && (
          <div className={styles.related}>
            <h3 className={styles.relatedTitle}>Читать также</h3>
            <div className={styles.relatedGrid}>
              {related.map(r => (
                <a key={r.slug} href={`/blog/${r.slug}`} className={styles.relatedCard}>
                  {r.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
