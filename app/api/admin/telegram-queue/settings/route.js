import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('telegram_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const allowed = ['is_enabled', 'posts_per_hour', 'min_score', 'max_queue_age_hours'];
  const patch = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  // Санитизация значений
  if ('posts_per_hour' in patch) {
    patch.posts_per_hour = Math.max(1, Math.min(60, Number(patch.posts_per_hour) || 5));
  }
  if ('min_score' in patch) {
    patch.min_score = Number(patch.min_score) || 0;
  }
  if ('max_queue_age_hours' in patch) {
    patch.max_queue_age_hours = Math.max(1, Math.min(72, Number(patch.max_queue_age_hours) || 6));
  }
  if ('is_enabled' in patch) {
    patch.is_enabled = Boolean(patch.is_enabled);
  }

  patch.updated_at = new Date().toISOString();

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('telegram_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
