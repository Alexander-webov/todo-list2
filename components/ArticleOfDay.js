import styles from './ArticleOfDay.module.css';

const ARTICLES = [
  { slug: 'kak-uvelichit-chek-frilanser', title: 'Как поднять ставку в 2 раза не потеряв клиентов', desc: 'Проверенная стратегия повышения цены для фрилансеров с опытом от 1 года.' },
  { slug: 'avtomatizaciya-frilanser', title: 'Автоматизация рутины: как фрилансер экономит 3 часа в день', desc: 'Инструменты и скрипты которые убирают повторяющиеся задачи.' },
  { slug: 'frilanser-brendirovanie', title: 'Личный бренд фрилансера: почему клиенты платят больше знакомым', desc: 'Как построить репутацию которая приводит клиентов сама.' },
  { slug: 'niche-frilanser', title: 'Узкая специализация vs универсальность: что выгоднее', desc: 'Данные и реальные кейсы о доходе узких специалистов.' },
  { slug: 'frilanser-passive-income', title: 'Пассивный доход для фрилансера: 5 рабочих схем', desc: 'Как создать источники дохода которые работают пока ты спишь.' },
];

function getTodayArticle() {
  const day = new Date().getDate();
  return ARTICLES[day % ARTICLES.length];
}

export function ArticleOfDay() {
  const article = getTodayArticle();

  return (
    <a href={`/blog/${article.slug}`} className={styles.wrap}>
      <div className={styles.badge}>📰 Статья дня</div>
      <h3 className={styles.title}>{article.title}</h3>
      <p className={styles.desc}>{article.desc}</p>
      <span className={styles.link}>Читать статью →</span>
    </a>
  );
}
