import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { supabaseAdmin } from '@/lib/supabase';
import { ResumeEditorClient } from './ResumeEditorClient';

export const metadata = { title: 'Редактор резюме | FreelanceHere' };

export default async function ResumeEditPage({ params }) {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  const { data: resume } = await db
    .from('resumes')
    .select('id, country, data, created_at, updated_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!resume) notFound();

  return (
    <div>
      <Header />
      <ResumeEditorClient resume={resume} />
    </div>
  );
}
