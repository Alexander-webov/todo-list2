export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './source.module.css';

const SOURCES = {
  'fl-ru': {
    name: 'FL.ru',
    key: 'fl',
    emoji: '🇷🇺',
    color: '#ff6600',
    description: 'Все актуальные заказы с FL.ru в одном месте. Обновляется каждую минуту — находи новые проекты раньше других фрилансеров.',
    about: 'FL.ru — одна из старейших и крупнейших фриланс-бирж России. Здесь публикуются тысячи заказов ежедневно по всем направлениям: веб-разработка, дизайн, копирайтинг, маркетинг и другие.',
    keywords: 'FL.ru заказы, фриланс FL.ru, проекты FL.ru, удалённая работа FL',
  },
  'kwork': {
    name: 'Kwork',
    key: 'kwork',
    emoji: '🇷🇺',
    color: '#ff4d00',
    description: 'Все актуальные заказы с Kwork в одном месте. Новые проекты каждую минуту.',
    about: 'Kwork — популярная биржа фриланса где исполнители предлагают услуги фиксированной стоимостью. Здесь можно найти заказы на разработку, дизайн, маркетинг и многое другое.',
    keywords: 'Kwork заказы, фриланс Kwork, проекты Kwork, биржа Kwork',
  },
  'freelancer': {
    name: 'Freelancer.com',
    key: 'freelancer',
    emoji: '🌐',
    color: '#29b2fe',
    description: 'Все актуальные заказы с Freelancer.com в одном месте. Международные проекты каждую минуту.',
    about: 'Freelancer.com — крупнейшая международная биржа фриланса. Здесь публикуются проекты со всего мира на английском и других языках.',
    keywords: 'Freelancer.com заказы, международный фриланс, проекты Freelancer',
  },
  'freelanceru': {
    name: 'Freelance.ru',
    key: 'freelanceru',
    emoji: '🇷🇺',
    color: '#2ecc71',
    description: 'Все актуальные заказы с Freelance.ru в одном месте. Новые проекты каждую минуту.',
    about: 'Freelance.ru — российская фриланс-биржа с широким выбором проектов по всем направлениям.',
    keywords: 'Freelance.ru заказы, фриланс биржа, проекты Freelance.ru',
  },
  'upwork': {
    name: 'Upwork',
    key: 'upwork',
    emoji: '🌐',
    color: '#14a800',
    description: 'Все актуальные заказы с Upwork в одном месте. Крупнейшая мировая фриланс-платформа.',
    about: 'Upwork — крупнейшая мировая платформа для фрилансеров. Миллионы проектов по разработке, дизайну, маркетингу и другим направлениям.',
    keywords: 'Upwork заказы, фриланс Upwork, международная биржа, удалённая работа',
  },
  'peopleperhour': {
    name: 'PeoplePerHour',
    key: 'peopleperhour',
    emoji: '🌐',
    color: '#f7931a',
    description: 'Все актуальные заказы с PeoplePerHour. Британская фриланс-биржа с проектами по всему миру.',
    about: 'PeoplePerHour — британская платформа для фрилансеров, популярная в Европе и по всему миру. Удобная система предложений и проектов.',
    keywords: 'PeoplePerHour заказы, фриланс PPH, британская биржа, удалённая работа',
  },
  'guru': {
    name: 'Guru.com',
    key: 'guru',
    emoji: '🌐',
    color: '#5b3cc4',
    description: 'Все актуальные заказы с Guru.com. Международная фриланс-биржа с проектами для профессионалов.',
    about: 'Guru.com — международная фриланс-платформа, ориентированная на профессиональных исполнителей. Проекты по разработке, дизайну, бизнес-консультированию и другим областям.',
    keywords: 'Guru.com заказы, фриланс Guru, международная биржа, профессиональный фриланс',
  },
};

export async function generateMetadata({ params }) {
  const source = SOURCES[params.slug];
  if (!source) return { title: 'Не найдено' };
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';
  return {
    title: `${source.name} — все заказы | FreelanceHere`,
    description: source.description,
    keywords: source.keywords,
    alternates: {
      canonical: `${SITE_URL}/source/${params.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(SOURCES).map(slug => ({ slug }));
}

export default async function SourcePage({ params }) {
  const source = SOURCES[params.slug];
  if (!source) notFound();

  const db = supabaseAdmin();
  const { data: projects, count } = await db
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('source', source.key)
    .order('created_at', { ascending: false })
    .limit(50);

  const CATEGORY_NAMES = {
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

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.hero} style={{ '--source-color': source.color }}>
          <span className={styles.emoji}>{source.emoji}</span>
          <h1 className={styles.title}>Заказы с {source.name}</h1>
          <p className={styles.desc}>{source.about}</p>
          <div className={styles.stats}>
            <span>📋 {count || 0} актуальных заказов</span>
            <span>⚡ Обновляется каждую минуту</span>
          </div>
        </div>

        {/* Навигация по биржам */}
        <div className={styles.sourceNav}>
          {Object.entries(SOURCES).map(([slug, s]) => (
            <Link key={slug} href={`/source/${slug}`}
              className={`${styles.sourceLink} ${slug === params.slug ? styles.sourceLinkActive : ''}`}
              style={{ '--c': s.color }}>
              {s.emoji} {s.name}
            </Link>
          ))}
        </div>

        <div className={styles.list}>
          {(projects || []).map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.category}>
                  {CATEGORY_NAMES[p.category] || p.category || 'Другое'}
                </span>
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

        <div className={styles.cta}>
          <h2>Получай новые заказы с {source.name} первым</h2>
          <p>Подключи уведомления в Telegram — новые проекты приходят сразу как появляются на {source.name}</p>
          <a href="/register" className={styles.ctaBtn}>Зарегистрироваться бесплатно</a>
        </div>
      </div>
    </div>
  );
}
