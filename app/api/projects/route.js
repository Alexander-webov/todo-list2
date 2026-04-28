import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RU_SOURCES, INT_SOURCES } from '@/lib/parsers/index';
import { categoriesForRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const page     = parseInt(searchParams.get('page')  || '1', 10);
  const limit    = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const source   = searchParams.get('source');
  const category = searchParams.get('category');
  const role     = searchParams.get('role');
  const search   = searchParams.get('search');
  const since    = searchParams.get('since');
  const region   = searchParams.get('region'); // 'ru' | 'int'

  const db   = supabaseAdmin();
  const from = (page - 1) * limit;

  let query = db
    .from('projects')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  // Фильтр по региону (приоритет у source — если указан конкретный source, region игнорируется)
  if (source) {
    query = query.eq('source', source);
  } else if (region === 'ru') {
    query = query.in('source', RU_SOURCES);
  } else if (region === 'int') {
    query = query.in('source', INT_SOURCES);
  }

  // category имеет приоритет над role, если указаны оба
  if (category) {
    query = query.eq('category', category);
  } else if (role) {
    const cats = categoriesForRole(role);
    if (cats.length > 0) query = query.in('category', cats);
  }

  // Поиск — по названию И описанию (ilike на оба поля)
  if (search) {
    const s = search.replace(/[%_]/g, ' ').trim();
    if (s) query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }
  if (since)    query = query.gt('created_at', since);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: data || [],
    total:    count || 0,
    page,
    limit,
    pages:    Math.ceil((count || 0) / limit),
  });
}
