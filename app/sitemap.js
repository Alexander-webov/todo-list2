import { supabaseAdmin } from '@/lib/supabase';
import { ARTICLE_SLUGS } from './blog/articles-data';

// force-dynamic: не запекать sitemap на билде (иначе сборка виснет на запросе к БД).
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://allfreelancershere.ru';

const CATEGORY_SLUGS = [
  'wordpress-tilda-cms','videomontazh','graficheskij-dizajn','web-dizajn',
  'smm','parsing','verstka','frontend','backend',
];
const SOURCE_SLUGS = [
  'upwork','peopleperhour','guru',
];
const ROLE_SLUGS = [
  'designer', 'videomaker', 'developer', 'smm', 'other',
];

const BLOG_SLUGS = ARTICLE_SLUGS;

export default async function sitemap() {
  // Статьи из БД — если база недоступна, не валим sitemap, просто без них.
  let newDbSlugs = [];
  try {
    const db = supabaseAdmin();
    const { data: dbArticles } = await db
      .from('blog_articles')
      .select('slug, updated_at')
      .eq('published', true);

    const dbSlugs = new Set(BLOG_SLUGS);
    newDbSlugs = (dbArticles || []).filter(a => !dbSlugs.has(a.slug));
  } catch (e) {
    newDbSlugs = [];
  }

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/partners`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...CATEGORY_SLUGS.map(slug => ({ url: `${SITE_URL}/category/${slug}`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 })),
    ...ROLE_SLUGS.map(slug => ({ url: `${SITE_URL}/for/${slug}`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.95 })),
    ...SOURCE_SLUGS.map(slug => ({ url: `${SITE_URL}/source/${slug}`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 })),
    // Статические статьи блога
    ...BLOG_SLUGS.map(slug => ({ url: `${SITE_URL}/blog/${slug}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 })),
    // Статьи из БД (только новые, которых нет в статических)
    ...newDbSlugs.map(a => ({ url: `${SITE_URL}/blog/${a.slug}`, lastModified: new Date(a.updated_at), changeFrequency: 'monthly', priority: 0.8 })),

  ];
}
