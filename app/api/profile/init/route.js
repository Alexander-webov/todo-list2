import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { isValidRole } from '@/lib/roles';

export const runtime = 'nodejs';

// POST /api/profile/init — вызывается после регистрации
// Сохраняет выбранную роль в profiles
export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const patch = {};

  if (body.user_role && isValidRole(body.user_role)) {
    patch.user_role = body.user_role;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = supabaseAdmin();
  const { error } = await db.from('profiles').update(patch).eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/profile/init — смена роли позже (из настроек)
export async function PATCH(request) {
  return POST(request);
}
