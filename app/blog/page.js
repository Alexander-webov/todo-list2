import styles from './blog.module.css';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { supabaseAdmin } from '@/lib/supabase';
import { ARTICLE_LIST } from './articles-data';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Блог о фрилансе — советы и статьи | FreelanceHere',
  description: 'Полезные статьи о фрилансе: как найти заказы, как писать отклики, как зарабатывать больше.',
  alternates: {
    canonical: 'https://allfreelancershere.ru/blog',
  },
};

// Список статей берётся из единого файла articles-data.js (ARTICLE_LIST)

export default async function BlogPage() {
  // Загружаем статьи из БД
  let dbArticles = [];
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('blog_articles')
      .select('slug, title, description, emoji, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Blog] Ошибка загрузки статей из БД:', error.message);
    } else {
      dbArticles = data || [];
      console.log(`[Blog] Загружено из БД: ${dbArticles.length} статей`);
    }
  } catch (err) {
    console.error('[Blog] Exception:', err.message);
  }

  // Объединяем: сначала из БД, потом статические (без дублей)
  const dbSlugs = new Set(dbArticles.map(a => a.slug));
  const staticFiltered = ARTICLE_LIST.filter(a => !dbSlugs.has(a.slug));
  const allArticles = [
    ...dbArticles.map(a => ({ ...a, desc: a.description || a.desc || '', fromDB: true })),
    ...staticFiltered,
  ];

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Блог о фрилансе</h1>
          <p className={styles.sub}>Советы, стратегии и инструменты для фрилансеров</p>
        </div>

        <div className={styles.grid}>
          {allArticles.map(a => (
            <Link key={a.slug} href={`/blog/${a.slug}`} className={styles.card}>
              <span className={styles.cardEmoji}>{a.emoji || '📝'}</span>
              <h2 className={styles.cardTitle}>{a.title}</h2>
              <p className={styles.cardDesc}>{a.desc}</p>
              <div className={styles.cardMeta}>
                <span>Читать →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
