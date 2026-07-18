import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ProjectsFeed } from '@/components/ProjectsFeed';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { RightSidebar } from '@/components/RightSidebar2';
import { TopBar } from '@/components/TopBar';
import { RU_SOURCES, INT_SOURCES } from '@/lib/parsers/index';
import { categoriesForRole } from '@/lib/roles';

export const revalidate = 0;

// Кэш стартовой ленты в памяти — режет egress на каждом заходе.
const _homeCache = new Map();
const _HOME_TTL = 5 * 60 * 1000;

export const metadata = {
  alternates: {
    canonical: 'https://allfreelancershere.ru',
  },
};

async function getInitialProjects({ role, region }) {
  const _key = JSON.stringify({ role: role || null, region: region || null });
  const _hit = _homeCache.get(_key);
  if (_hit && Date.now() - _hit.at < _HOME_TTL) return _hit.val;

  const db = supabaseAdmin();
  let query = db
    .from('projects')
    .select('id, source, title, description, budget_min, budget_max, currency, category, tags, url, referral_url, published_at, created_at', { count: 'planned' })
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
  const projects = (data || []).map((pr) =>
    pr.description && pr.description.length > 300
      ? { ...pr, description: pr.description.slice(0, 300) }
      : pr
  );
  const val = { projects, total: count || 0 };
  _homeCache.set(_key, { at: Date.now(), val });
  if (_homeCache.size > 50) _homeCache.clear();
  return val;
}

async function getStats() {
  const db = supabaseAdmin();
  const { count: total } = await db
    .from('projects').select('*', { count: 'planned', head: true });

  // Проекты, добавленные за сегодня
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from('projects')
    .select('*', { count: 'planned', head: true })
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
        {/*  <RightSidebar /> */}
      </main>
    </div>
  );
}
