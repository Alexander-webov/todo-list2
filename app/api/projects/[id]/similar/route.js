import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET /api/projects/[id]/similar
// Возвращает 6 похожих проектов: той же категории, исключая текущий
export async function GET(request, { params }) {
  const db = supabaseAdmin();

  // Подтягиваем исходник чтобы знать категорию + бюджет
  const { data: base } = await db
    .from('projects')
    .select('category, source, budget_min, currency, tags')
    .eq('id', params.id)
    .single();

  if (!base) {
    return NextResponse.json({ projects: [] });
  }

  // Похожие = та же категория + свежие + не сам проект
  let query = db
    .from('projects')
    .select('id, title, description, source, category, budget_min, budget_max, currency, created_at, published_at, tags')
    .neq('id', params.id)
    .order('created_at', { ascending: false })
    .limit(6);

  if (base.category) query = query.eq('category', base.category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ projects: [] });

  return NextResponse.json({
    projects: data || [],
    baseCategory: base.category,
  });
}
