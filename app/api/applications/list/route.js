import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/applications/list — список откликов текущего пользователя.
// Читаем только из applications (title/url там уже снапшотятся при
// отклике), join с projects не нужен — так страница переживает чистку
// старых проектов из БД.
export async function GET(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;
  const from = (page - 1) * limit;

  const db = supabaseAdmin();

  let query = db
    .from('applications')
    .select('id, project_id, title, url, source, project_budget, status, used_ai, deal_amount, notes, created_at, status_updated_at', { count: 'planned' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Applications list] Ошибка:', error.message);
    return NextResponse.json({ error: error.message, applications: [], total: 0 }, { status: 500 });
  }

  return NextResponse.json({
    applications: data || [],
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  });
}
