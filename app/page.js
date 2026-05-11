import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ProjectsFeed } from '@/components/ProjectsFeed';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { TopBar } from '@/components/TopBar';
import { RU_SOURCES, INT_SOURCES } from '@/lib/parsers/index';
import { categoriesForRole } from '@/lib/roles';

export const revalidate = 0;

export const metadata = {
  alternates: {
    canonical: 'https://allfreelancershere.ru',
  },
};

async function getInitialProjects({ role, region }) {
  const db = supabaseAdmin();
  let query = db
    .from('projects')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(20);

  if (region === 'ru') {
    query = query.in('source', RU_SOURCES);
  } else if (region === 'int') {
    query = query.in('source', INT_SOURCES);
  }
  // region === 'all' → не фильтруем по источникам

  if (role) {
    const cats = categoriesForRole(role);
    if (cats.length > 0) query = query.in('category', cats);
  }

  const { data, count } = await query;
  return { projects: data || [], total: count || 0 };
}

async function getStats() {
  const db = supabaseAdmin();
  const { count: total } = await db
    .from('projects').select('*', { count: 'exact', head: true });

  // Проекты, добавленные за сегодня
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());

  return { total: total || 0, todayCount: todayCount || 0 };
}

export default async function HomePage({ searchParams }) {
  const { profile } = await getCurrentUser();

  const urlRole = searchParams?.role;
  const urlCategory = searchParams?.category;
  const urlSource = searchParams?.source;
  const urlSearch = searchParams?.search;

  const effectiveRole = urlRole
    || (profile?.user_role && !urlCategory && !urlSource && !urlSearch
          ? profile.user_role
          : null);

  const region = searchParams?.region || 'ru';

  const [{ projects, total: feedTotal }, { total, todayCount }] = await Promise.all([
    getInitialProjects({ role: effectiveRole, region }),
    getStats(),
  ]);

  return (
    <div className="app-shell">
      <Header />
      <main className="main-layout">
        <Sidebar />
        <div className="main-content">
          <TopBar total={total} todayCount={todayCount} />
          <ProjectsFeed
            initialProjects={projects}
            total={feedTotal}
            isLoggedIn={!!profile}
            profile={profile}
          />
        </div>
        <RightSidebar />
      </main>
    </div>
  );
}
