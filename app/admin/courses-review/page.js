import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CoursesReviewClient } from './CoursesReviewClient';

export const metadata = { title: 'Проверка курсов — Admin' };

export default async function CoursesReviewPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) redirect('/');

  return <CoursesReviewClient />;
}
