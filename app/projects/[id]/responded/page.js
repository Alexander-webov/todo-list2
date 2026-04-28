import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { RespondedClient } from '@/components/RespondedClient';

export const metadata = {
  title: 'Ты откликнулся — что дальше | FreelanceHere',
  robots: { index: false, follow: false }, // не хотим чтоб это индексировалось
};

export default async function RespondedPage({ params }) {
  const db = supabaseAdmin();
  const { data: project } = await db
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

  const { user } = await getCurrentUser();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 20px 64px' }}>
        <RespondedClient
          project={project}
          isLoggedIn={!!user}
          userId={user?.id || null}
        />
      </div>
    </div>
  );
}
