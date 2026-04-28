import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminClient } from './AdminClient';
import { supabaseAdmin } from '@/lib/supabase';

export default async function AdminPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) redirect('/');

  const db = supabaseAdmin();
  const { data: gifts } = await db
    .from('premium_gifts')
    .select('*, profiles!premium_gifts_user_id_fkey(email)')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: stats } = await db
    .from('profiles')
    .select('is_premium')

  const totalUsers = stats?.length || 0;
  const premiumUsers = stats?.filter(p => p.is_premium).length || 0;

  return <AdminClient gifts={gifts || []} totalUsers={totalUsers} premiumUsers={premiumUsers} />;
}
