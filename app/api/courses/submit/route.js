import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { courseId } = body || {};
  if (!courseId) return NextResponse.json({ error: 'Не указан курс' }, { status: 400 });

  const db = supabaseAdmin();

  // Проверяем, что все уроки курса реально пройдены — не доверяем клиенту
  const { data: lessons } = await db.from('course_lessons').select('id').eq('course_id', courseId);
  const { data: completed } = await db
    .from('course_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .in('lesson_id', (lessons || []).map(l => l.id));

  if (!lessons?.length || (completed || []).length < lessons.length) {
    return NextResponse.json({ error: 'Сначала пройди все уроки курса' }, { status: 400 });
  }

  const { data: existing } = await db
    .from('course_submissions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (existing?.status === 'approved') {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ ok: true, alreadyPending: true });
  }

  const { error } = await db.from('course_submissions').upsert(
    { user_id: user.id, course_id: courseId, status: 'pending', submitted_at: new Date().toISOString() },
    { onConflict: 'user_id,course_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
