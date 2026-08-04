import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = supabaseAdmin();

  const { data: submissions, error } = await db
    .from('course_submissions')
    .select('id, user_id, course_id, status, submitted_at, courses(title, reward_amount), profiles(email)')
    .eq('status', 'pending')
    .order('submitted_at');

  if (error) return NextResponse.json({ error: error.message, submissions: [] }, { status: 500 });

  // Подтягиваем ответы пользователя по каждому уроку курса — чтобы админ
  // видел, что реально написали/сделали, а не просто факт "отметил".
  const enriched = await Promise.all((submissions || []).map(async (sub) => {
    const { data: lessons } = await db
      .from('course_lessons')
      .select('id, sort_order, title, task, task_type')
      .eq('course_id', sub.course_id)
      .order('sort_order');

    const { data: progress } = await db
      .from('course_progress')
      .select('lesson_id, proof, completed_at')
      .eq('user_id', sub.user_id)
      .in('lesson_id', (lessons || []).map(l => l.id));

    const proofByLesson = Object.fromEntries((progress || []).map(p => [p.lesson_id, p]));

    return {
      id: sub.id,
      userEmail: sub.profiles?.email || sub.user_id,
      courseTitle: sub.courses?.title || '—',
      rewardAmount: sub.courses?.reward_amount || 0,
      submittedAt: sub.submitted_at,
      lessons: (lessons || []).map(l => ({
        title: l.title,
        task: l.task,
        taskType: l.task_type,
        proof: proofByLesson[l.id]?.proof || null,
        completedAt: proofByLesson[l.id]?.completed_at || null,
      })),
    };
  }));

  return NextResponse.json({ submissions: enriched });
}
