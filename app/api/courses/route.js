import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// GET — список курсов + прогресс текущего пользователя (если залогинен)
export async function GET() {
  const { user } = await getCurrentUser();
  const db = supabaseAdmin();

  const { data: courses, error } = await db
    .from('courses')
    .select('id, slug, title, description, emoji, reward_amount, sort_order, course_lessons(id)')
    .eq('is_published', true)
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message, courses: [] }, { status: 500 });

  let progressByLesson = {};
  let submissionByCourse = {};
  if (user) {
    const { data: progress } = await db
      .from('course_progress')
      .select('lesson_id')
      .eq('user_id', user.id);
    progressByLesson = Object.fromEntries((progress || []).map(p => [p.lesson_id, true]));

    const { data: submissions } = await db
      .from('course_submissions')
      .select('course_id, status')
      .eq('user_id', user.id);
    submissionByCourse = Object.fromEntries((submissions || []).map(s => [s.course_id, s.status]));
  }

  const result = (courses || []).map(c => {
    const lessonIds = (c.course_lessons || []).map(l => l.id);
    const completedCount = lessonIds.filter(id => progressByLesson[id]).length;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      emoji: c.emoji,
      reward_amount: c.reward_amount,
      totalLessons: lessonIds.length,
      completedLessons: completedCount,
      allLessonsDone: lessonIds.length > 0 && completedCount === lessonIds.length,
      submissionStatus: submissionByCourse[c.id] || null, // null | 'pending' | 'approved' | 'rejected'
    };
  });

  return NextResponse.json({ courses: result, isLoggedIn: !!user });
}
