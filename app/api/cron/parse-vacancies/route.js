import { NextResponse } from 'next/server';
import { runAllVacancyParsers } from '@/lib/parsers/vacancies/index';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

let isRunning = false;
let runningSince = 0;
const MAX_RUN_MS = 5 * 60 * 1000;

const MAX_VACANCIES = 4500;
const KEEP_VACANCIES = 2500;
// Вакансии устаревают быстрее фриланс-заказов — жёсткий потолок в неделю,
// независимо от того, сколько их всего в базе.
const MAX_AGE_DAYS = 7;

async function cleanupByAge() {
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error, count: deleted } = await db
    .from('vacancies')
    .delete({ count: 'exact' })
    .lt('published_at', cutoff);

  if (error) {
    console.error('[Cleanup vacancies by age] Ошибка:', error.message);
    return 0;
  }
  if (deleted) console.log(`[Cleanup vacancies by age] Удалено старше ${MAX_AGE_DAYS} дней: ${deleted}`);
  return deleted || 0;
}

async function cleanupIfNeeded() {
  const db = supabaseAdmin();

  const { count } = await db
    .from('vacancies')
    .select('*', { count: 'planned', head: true });

  console.log(`[Cleanup vacancies] В БД: ${count}`);
  if (!count || count < MAX_VACANCIES) return 0;

  const { data: cutoffRow } = await db
    .from('vacancies')
    .select('published_at')
    .order('published_at', { ascending: false })
    .range(KEEP_VACANCIES - 1, KEEP_VACANCIES - 1)
    .single();

  if (!cutoffRow) return 0;

  const { error, count: deleted } = await db
    .from('vacancies')
    .delete({ count: 'exact' })
    .lt('published_at', cutoffRow.published_at);

  if (error) {
    console.error('[Cleanup vacancies] Ошибка:', error.message);
    return 0;
  }

  console.log(`[Cleanup vacancies] Удалено: ${deleted}`);
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
    const added = await runAllVacancyParsers();

    return NextResponse.json({
      success: true,
      added,
      deleted: deletedByAge + deletedByCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron vacancies] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
