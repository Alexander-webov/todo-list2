import { NextResponse } from 'next/server';
import { runAllParsers } from '@/lib/parsers/index';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Замок от наложения запусков парсера (наложение забивало память/CPU и роняло базу).
let isRunning = false;
let runningSince = 0;
const MAX_RUN_MS = 5 * 60 * 1000;

const MAX_PROJECTS = 4500;
const KEEP_PROJECTS = 2500;
// Раньше чистка была только по количеству (если проектов < 4500 — не трогаем
// вообще). Значит объявление месячной давности могло висеть в базе
// бесконечно, пока общее число не упрётся в лимит. Добавляем отдельную
// чистку по возрасту — жёсткий потолок независимо от количества.
// 30 дней — разумный дефолт для фриланс-заказов (могут быть открыты
// дольше вакансий), можно поменять одной константой.
const MAX_AGE_DAYS = 30;

async function cleanupByAge() {
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error, count: deleted } = await db
    .from('projects')
    .delete({ count: 'exact' })
    .lt('published_at', cutoff);

  if (error) {
    console.error('[Cleanup by age] Ошибка:', error.message);
    return 0;
  }
  if (deleted) console.log(`[Cleanup by age] Удалено проектов старше ${MAX_AGE_DAYS} дней: ${deleted}`);
  return deleted || 0;
}

async function cleanupIfNeeded() {
  const db = supabaseAdmin();

  const { count } = await db
    .from('projects')
    .select('*', { count: 'planned', head: true });

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

  if (isRunning && Date.now() - runningSince < MAX_RUN_MS) {
    return NextResponse.json({ skipped: true, reason: 'already_running' });
  }
  isRunning = true;
  runningSince = Date.now();
  try {
    const deletedByAge = await cleanupByAge();
    const deletedByCount = await cleanupIfNeeded();
    const added = await runAllParsers();

    return NextResponse.json({
      success: true,
      added,
      deleted: deletedByAge + deletedByCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
