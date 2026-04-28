import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TelegramQueueClient } from './TelegramQueueClient';

export const metadata = {
  title: 'Telegram очередь — Admin',
};

export default async function TelegramQueuePage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) redirect('/');

  return <TelegramQueueClient />;
}
