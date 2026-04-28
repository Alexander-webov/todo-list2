import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage({ searchParams }) {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect('/login');

  const db = supabaseAdmin();
  const { data: payments } = await db
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <DashboardClient
      profile={profile}
      email={user.email}
      payments={payments || []}
      paymentStatus={searchParams?.payment}
    />
  );
}
