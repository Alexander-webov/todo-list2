import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RU_VACANCY_SOURCES, WORLD_VACANCY_SOURCES } from '@/lib/parsers/vacancies/index';
import { createTTLCache } from '@/lib/simpleCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const _cache = createTTLCache(5 * 60 * 1000, 300);

export async function GET(request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured: Supabase env missing', vacancies: [], total: 0, page: 1, limit: 20, pages: 0 },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page     = parseInt(searchParams.get('page')  || '1', 10);
    const limit    = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const source   = searchParams.get('source');
    const category = searchParams.get('category');
    const search   = searchParams.get('search');
    const since    = searchParams.get('since');
    const region   = searchParams.get('region'); // 'ru' | 'world'

    const _key = JSON.stringify({ page, limit, source, category, search, since, region });
    const _hit = _cache.get(_key);
    if (_hit) {
      return NextResponse.json(_hit);
    }

    const db   = supabaseAdmin();
    const from = (page - 1) * limit;

    let query = db
      .from('vacancies')
      .select('id, source, region, title, company, description, salary_min, salary_max, currency, category, employment_type, tags, url, published_at, created_at', { count: 'planned' })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (source) {
      query = query.eq('source', source);
    } else if (region === 'ru') {
      query = query.in('source', RU_VACANCY_SOURCES);
    } else if (region === 'world') {
      query = query.in('source', WORLD_VACANCY_SOURCES);
    }

    if (category) query = query.eq('category', category);

    if (search) {
      const s = search.replace(/[%_]/g, ' ').trim();
      if (s) query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,company.ilike.%${s}%`);
    }
    if (since) query = query.gt('created_at', since);

    const { data, count, error } = await query;
    if (error) {
      console.error('[api/vacancies] Ошибка:', error.message);
      return NextResponse.json({ error: error.message, vacancies: [], total: 0, page, limit, pages: 0 }, { status: 500 });
    }

    const body = {
      vacancies: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    };

    _cache.set(_key, body);
    return NextResponse.json(body);
  } catch (err) {
    console.error('[api/vacancies] Необработанная ошибка:', err);
    return NextResponse.json({ error: err.message, vacancies: [], total: 0, page: 1, limit: 20, pages: 0 }, { status: 500 });
  }
}
