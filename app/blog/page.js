import styles from './blog.module.css';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Блог о фрилансе — советы и статьи | FreelanceHere',
  description: 'Полезные статьи о фрилансе: как найти заказы, как писать отклики, как зарабатывать больше.',
  alternates: {
    canonical: 'https://allfreelancershere.ru/blog',
  },
};

const STATIC_ARTICLES = [
  { slug: 'kak-uvelichit-chek-frilanser', title: 'Как поднять ставку в 2 раза не потеряв клиентов', desc: 'Проверенная стратегия повышения цены.', emoji: '📈' },
  { slug: 'avtomatizaciya-frilanser', title: 'Автоматизация рутины: как экономить 3 часа в день', desc: 'Инструменты которые убирают повторяющиеся задачи.', emoji: '🤖' },
  { slug: 'frilanser-brendirovanie', title: 'Личный бренд фрилансера: почему клиенты платят больше знакомым', desc: 'Как построить репутацию которая приводит клиентов сама.', emoji: '⭐' },
  { slug: 'niche-frilanser', title: 'Узкая специализация vs универсальность: что выгоднее', desc: 'Данные и реальные кейсы о доходе узких специалистов.', emoji: '🎯' },
  { slug: 'frilanser-passive-income', title: 'Пассивный доход для фрилансера: 5 рабочих схем', desc: 'Как создать источники дохода которые работают пока ты спишь.', emoji: '💸' },
  { slug: 'frilanser-dogovor', title: 'Договор с заказчиком: как защитить себя юридически', desc: 'Какие пункты обязательны и как избежать неоплаты.', emoji: '📋' },
  { slug: 'frilanser-klienty-telegram', title: 'Как находить клиентов в Telegram: полное руководство', desc: 'Каналы, чаты и стратегии поиска заказов.', emoji: '✈️' },
  { slug: 'frilanser-rate-hour', title: 'Почасовая ставка vs фиксированная цена: что выгоднее', desc: 'Когда брать почасово а когда фиксированно.', emoji: '⏱️' },
  { slug: 'frilanser-repeat-clients', title: 'Система удержания клиентов: как 20% приносят 80% дохода', desc: 'Как превратить разовых заказчиков в постоянных.', emoji: '🔄' },
  { slug: 'frilanser-scope-creep', title: 'Scope creep: как остановить расширение проекта без конфликта', desc: 'Заказчик добавляет задачи? Как говорить нет профессионально.', emoji: '🛑' },
  { slug: 'kak-najti-zakazy-na-freelanse', title: 'Как находить заказы на фрилансе быстрее конкурентов', desc: 'Главный секрет успешного фрилансера — скорость отклика.', emoji: '🚀' },
  { slug: 'kak-napisat-otklik-na-freelanse', title: 'Как написать отклик который точно прочитают', desc: 'Структура идеального отклика на фриланс-проект.', emoji: '✍️' },
  { slug: 'luchshie-frilansy-birzhi-rossii', title: 'Лучшие фриланс-биржи России в 2024 году', desc: 'Сравнение FL.ru, Kwork и Freelance.ru.', emoji: '📊' },
  { slug: 'skolko-zarabatyvaet-frilanser', title: 'Сколько зарабатывает фрилансер в России', desc: 'Реальные цифры по категориям.', emoji: '💰' },
  { slug: 'kak-nachat-frilansat-s-nulya', title: 'Как начать фрилансить с нуля — пошаговый план', desc: 'Пошаговый план для начинающих.', emoji: '🎯' },
  { slug: 'pochemu-frilanser-ne-nahodit-zakazov', title: 'Почему фрилансер не находит заказы — 7 причин', desc: 'Типичные ошибки и как их исправить.', emoji: '🔍' },
];

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
  const staticFiltered = STATIC_ARTICLES.filter(a => !dbSlugs.has(a.slug));
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
