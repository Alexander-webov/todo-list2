import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { VacanciesFeed } from '@/components/VacanciesFeed';
import styles from './remote-work.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Удалённая работа — вакансии RU и со всего мира | FreelanceHere',
  description: 'Актуальные вакансии на удалёнке: Россия и весь мир, все категории — от «без навыков» до разработки. Бесплатно первые 5, всё остальное — по единому премиуму.',
  alternates: { canonical: 'https://allfreelancershere.ru/remote-work' },
};

export default async function RemoteWorkPage() {
  const { user, profile } = await getCurrentUser();

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Удалённая работа</h1>
          <p className={styles.desc}>
            Собираем вакансии на удалёнке с HH.ru и Avito по России, а также с RemoteOK, WeWorkRemotely и Remotive
            по всему миру — в одной ленте, с разбивкой по категориям.
          </p>
        </div>

        <VacanciesFeed isLoggedIn={!!user} profile={profile} />
      </div>
    </div>
  );
}
