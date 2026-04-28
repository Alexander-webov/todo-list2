import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const external_id = searchParams.get('external_id');
  const source = searchParams.get('source');

  if (!external_id || !source) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from('customers')
    .select('*')
    .eq('external_id', external_id)
    .eq('source', source)
    .single();

  if (!data) return NextResponse.json({ customer: null });
  return NextResponse.json({ customer: data });
}
