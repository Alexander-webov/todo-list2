import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Показывает ВСЕХ пользователей с хоть каким-то прогрессом по курсам —
// в отличие от /pending (только те, кто дошёл до конца и явно отправил
// на проверку). Нужно, чтобы админ видел, кто на каком этапе, даже если
// человек ещё не закончил курс.
export async function GET() {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = supabaseAdmin();

  const { data: courses } = await db
    .from('courses')
    .select('id, title, reward_amount, course_lessons(id, sort_order, title, task, task_type)')
    .eq('is_published', true);

  const { data: allProgress } = await db
    .from('course_progress')
    .select('user_id, lesson_id, proof, completed_at, profiles(email)')
    .order('completed_at', { ascending: false });

  const { data: submissions } = await db
    .from('course_submissions')
    .select('user_id, course_id, status');

  const submissionKey = (userId, courseId) => `${userId}:${courseId}`;
  const submissionMap = Object.fromEntries(
    (submissions || []).map(s => [submissionKey(s.user_id, s.course_id), s.status])
  );

  // Группируем прогресс по (user_id, course_id)
  const lessonToCourse = {};
  for (const c of courses || []) {
    for (const l of c.course_lessons || []) lessonToCourse[l.id] = c;
  }

  const grouped = {};
  for (const p of allProgress || []) {
    const course = lessonToCourse[p.lesson_id];
    if (!course) continue;
    const key = `${p.user_id}:${course.id}`;
    if (!grouped[key]) {
      grouped[key] = {
        userId: p.user_id,
        userEmail: p.profiles?.email || p.user_id,
        courseId: course.id,
        courseTitle: course.title,
        rewardAmount: course.reward_amount,
        totalLessons: (course.course_lessons || []).length,
        lessons: (course.course_lessons || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(l => ({ id: l.id, title: l.title, taskType: l.task_type, proof: null, completedAt: null })),
        lastActivity: p.completed_at,
      };
    }
    const lessonEntry = grouped[key].lessons.find(l => l.id === p.lesson_id);
    if (lessonEntry) {
      lessonEntry.proof = p.proof;
      lessonEntry.completedAt = p.completed_at;
    }
    if (p.completed_at > grouped[key].lastActivity) grouped[key].lastActivity = p.completed_at;
  }

  const result = Object.values(grouped)
    .map(g => ({
      ...g,
      completedCount: g.lessons.filter(l => l.completedAt).length,
      submissionStatus: submissionMap[submissionKey(g.userId, g.courseId)] || null,
    }))
    // Уже одобренные не показываем здесь — они закрыты, только незавершённые/непроверенные
    .filter(g => g.submissionStatus !== 'approved')
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

  return NextResponse.json({ progress: result });
}
