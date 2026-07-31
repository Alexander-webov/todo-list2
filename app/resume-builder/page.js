import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { ResumeListClient } from './ResumeListClient';

export const metadata = {
  title: 'Конструктор резюме | FreelanceHere',
  description: 'Собери резюме под Россию или США/Европу с AI-советами по каждому разделу. Первое резюме бесплатно.',
};

export default async function ResumeBuilderPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login?redirect=/resume-builder');

  return (
    <div>
      <Header />
      <ResumeListClient />
    </div>
  );
}
