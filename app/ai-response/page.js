import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { AIResponseClient } from './AIResponseClient';

export const metadata = {
  title: 'AI-генератор откликов на проекты и вакансии | FreelanceHere',
  description: 'Вставь описание проекта или вакансии — AI сгенерирует живой, персонализированный отклик за секунды. Первая генерация бесплатно.',
};

export default async function AIResponsePage() {
  const { user, profile } = await getCurrentUser();

  return (
    <div>
      <Header />
      <AIResponseClient
        isLoggedIn={!!user}
        freeUsed={!!profile?.ai_free_used}
        credits={profile?.ai_credits || 0}
      />
    </div>
  );
}
