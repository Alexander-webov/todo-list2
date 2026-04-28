import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ProjectsFeed } from '@/components/ProjectsFeed';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StatsBar } from '@/components/StatsBar';
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
    .order('created_at', { ascending: false })
    .limit(20);

  const regionSources = region === 'int' ? INT_SOURCES : RU_SOURCES;
  query = query.in('source', regionSources);

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

  const sources = ['fl', 'kwork', 'freelanceru', 'youdo', 'upwork', 'freelancer', 'peopleperhour', 'guru'];
  const stats = {};
  await Promise.all(sources.map(async (source) => {
    const { count } = await db
      .from('projects').select('*', { count: 'exact', head: true }).eq('source', source);
    stats[source] = count || 0;
  }));
  return { stats, total: total || 0 };
}

export default async function HomePage({ searchParams }) {
  const { profile } = await getCurrentUser();

  // Если URL без фильтров и у юзера есть user_role — применяем как дефолт
  const urlRole = searchParams?.role;
  const urlCategory = searchParams?.category;
  const urlSource = searchParams?.source;
  const urlSearch = searchParams?.search;

  const effectiveRole = urlRole
    || (profile?.user_role && !urlCategory && !urlSource && !urlSearch
          ? profile.user_role
          : null);

  const region = searchParams?.region || 'ru';

  const [{ projects, total: feedTotal }, { stats, total }] = await Promise.all([
    getInitialProjects({ role: effectiveRole, region }),
    getStats(),
  ]);

  return (
    <div className="app-shell">
      <Header />
      <StatsBar stats={stats} total={total} />
      <main className="main-layout">
        <Sidebar />
        <ProjectsFeed
          initialProjects={projects}
          total={feedTotal}
          isLoggedIn={!!profile}
          profile={profile}
        />
      </main>
    </div>
  );
}
