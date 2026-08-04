import { Header } from '@/components/Header';
import { CoursesListClient } from './CoursesListClient';

export const metadata = {
  title: 'Курсы для фрилансеров — бесплатно | FreelanceHere',
  description: 'Практические курсы с заданиями: как начать фрилансить, найти первые заказы и не облажаться на первой сделке. Проходи курсы — получай баланс на услуги сайта.',
};

export default function CoursesPage() {
  return (
    <div>
      <Header />
      <CoursesListClient />
    </div>
  );
}
