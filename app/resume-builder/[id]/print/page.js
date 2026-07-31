import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { PrintClient } from './PrintClient';

export const metadata = { title: 'Резюме — печать', robots: { index: false, follow: false } };

export default async function ResumePrintPage({ params }) {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  const { data: resume } = await db
    .from('resumes')
    .select('id, country, data')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!resume) notFound();

  return <PrintClient resume={resume} />;
}
