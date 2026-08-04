import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Валидация задания идёт на сервере, не только на клиенте — иначе кнопку
// "выполнено" можно просто дёрнуть напрямую через devtools/curl.
function validateProof(lesson, proof) {
  const cfg = lesson.task_config || {};
  switch (lesson.task_type) {
    case 'text_input': {
      const text = (proof?.text || '').trim();
      const minLength = cfg.minLength || 10;
      if (text.length < minLength) return `Напиши развёрнутый ответ, минимум ${minLength} символов`;
      return null;
    }
    case 'exchange_links': {
      const clicked = Array.isArray(proof?.clicked) ? [...new Set(proof.clicked)] : [];
      const minRequired = cfg.minRequired || 3;
      const validNames = (cfg.links || []).map(l => l.name);
      const validClicks = clicked.filter(name => validNames.includes(name));
      if (validClicks.length < minRequired) return `Перейди минимум на ${minRequired} разные биржи из списка`;
      return null;
    }
    case 'self_report':
    case 'project_click_check':
    default:
      return null; // project_click_check проверяется отдельно ниже, по факту в БД, не по proof с клиента
  }
}

export async function POST(request) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { lessonId, proof } = body || {};
  if (!lessonId) return NextResponse.json({ error: 'Не указан урок' }, { status: 400 });

  const db = supabaseAdmin();

  const { data: lesson } = await db
    .from('course_lessons')
    .select('id, course_id, task_type, task_config')
    .eq('id', lessonId)
    .single();
  if (!lesson) return NextResponse.json({ error: 'Урок не найден' }, { status: 404 });

  // project_click_check: не доверяем клиенту, проверяем реальный факт в БД —
  // хоть один переход на проект через applications (ставится при клике "Перейти").
  if (lesson.task_type === 'project_click_check') {
    const { count } = await db
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (!count || count < 1) {
      return NextResponse.json(
        { error: 'Сначала перейди хотя бы на один проект через кнопку «Перейти» на сайте' },
        { status: 400 }
      );
    }
  } else {
    const validationError = validateProof(lesson, proof);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Отмечаем урок пройденным + сохраняем, что именно сдал пользователь
  await db.from('course_progress').upsert(
    { user_id: user.id, lesson_id: lessonId, proof: proof || {} },
    { onConflict: 'user_id,lesson_id' }
  );

  // Проверяем — пройдены ли теперь ВСЕ уроки курса (для кнопки "Отправить на проверку")
  const { data: allLessons } = await db
    .from('course_lessons')
    .select('id')
    .eq('course_id', lesson.course_id);

  const { data: completed } = await db
    .from('course_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .in('lesson_id', (allLessons || []).map(l => l.id));

  const allLessonsDone = (allLessons || []).length > 0 && (completed || []).length === allLessons.length;

  return NextResponse.json({ ok: true, allLessonsDone });
}
