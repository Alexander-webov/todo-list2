import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ApplicationsClient } from './ApplicationsClient';

export const metadata = {
  title: 'Мои отклики | FreelancersHere',
  robots: { index: false, follow: false },
};

export default async function ApplicationsPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login');

  return <ApplicationsClient />;
}
