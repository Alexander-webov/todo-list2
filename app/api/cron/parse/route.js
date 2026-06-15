import { NextResponse } from 'next/server';
import { runAllParsers } from '@/lib/parsers/index';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PROJECTS = 4500;
const KEEP_PROJECTS = 2500;

// Защита от наложения запусков: если предыдущий проход ещё идёт —
// новый крон-вызов не стартует второй парсинг поверх первого.
// Именно наложение забивало память/CPU и роняло веб-сервер.
let isRunning = false;
let runningSince = 0;
const MAX_RUN_MS = 5 * 60 * 1000; // страховка: считаем зависшим через 5 мин

async function cleanupIfNeeded() {
  const db = supabaseAdmin();

  const { count } = await db
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`[Cleanup] Проектов в БД: ${count}`);

  if (count < MAX_PROJECTS) return 0;

  console.log(`[Cleanup] Достигнут лимит ${MAX_PROJECTS}, чистим до ${KEEP_PROJECTS}...`);

  // Удаляем по published_at — самые старые по дате публикации на бирже
  const { data: cutoffRow } = await db
    .from('projects')
    .select('published_at')
    .order('published_at', { ascending: false })
    .range(KEEP_PROJECTS - 1, KEEP_PROJECTS - 1)
    .single();

  if (!cutoffRow) return 0;

  const { error, count: deleted } = await db
    .from('projects')
    .delete({ count: 'exact' })
    .lt('published_at', cutoffRow.published_at);

  if (error) {
    console.error('[Cleanup] Ошибка:', error.message);
    return 0;
  }

  console.log(`[Cleanup] Удалено: ${deleted}, осталось: ~${KEEP_PROJECTS}`);
  return deleted || 0;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Если предыдущий проход ещё не закончился — пропускаем этот вызов.
  if (isRunning && Date.now() - runningSince < MAX_RUN_MS) {
    console.log('[Cron] Пропуск: предыдущий парсинг ещё идёт');
    return NextResponse.json({ skipped: true, reason: 'already_running' });
  }

  isRunning = true;
  runningSince = Date.now();
  try {
    const deleted = await cleanupIfNeeded();
    const added = await runAllParsers();

    return NextResponse.json({
      success: true,
      added,
      deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
