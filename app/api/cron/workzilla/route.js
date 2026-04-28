import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projects } = await request.json();
  if (!projects?.length) {
    return NextResponse.json({ added: 0 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('projects')
    .upsert(projects, { onConflict: 'source,external_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ added: data?.length || 0 });
}
