import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/categories';

export const runtime = 'nodejs';
export const revalidate = 60; // кэш 1 минута

export async function GET() {
  const db = supabaseAdmin();

  const counts = {};

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      const { count } = await db
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      counts[cat] = count || 0;
    })
  );

  return NextResponse.json(counts);
}
