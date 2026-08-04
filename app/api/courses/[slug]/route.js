import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { user } = await getCurrentUser();
  const db = supabaseAdmin();

  const { data: course, error } = await db
    .from('courses')
    .select('id, slug, title, description, emoji, reward_amount')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (error || !course) return NextResponse.json({ error: 'Курс не найден' }, { status: 404 });

  const { data: lessons } = await db
    .from('course_lessons')
    .select('id, sort_order, title, content, task, task_type, task_config')
    .eq('course_id', course.id)
    .order('sort_order');

  let completedIds = [];
  let proofByLesson = {};
  let submission = null;

  if (user) {
    const { data: progress } = await db
      .from('course_progress')
      .select('lesson_id, proof')
      .eq('user_id', user.id)
      .in('lesson_id', (lessons || []).map(l => l.id));
    completedIds = (progress || []).map(p => p.lesson_id);
    proofByLesson = Object.fromEntries((progress || []).map(p => [p.lesson_id, p.proof]));

    const { data: sub } = await db
      .from('course_submissions')
      .select('status, admin_note, submitted_at, reviewed_at')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single();
    submission = sub || null;
  }

  return NextResponse.json({
    course,
    lessons: lessons || [],
    completedIds,
    proofByLesson,
    submission,
    isLoggedIn: !!user,
  });
}
