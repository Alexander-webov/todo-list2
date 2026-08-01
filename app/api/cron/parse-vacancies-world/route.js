import { NextResponse } from 'next/server';
import { runWorldVacancyParsers } from '@/lib/parsers/vacancies/index';

export const runtime = 'nodejs';
export const maxDuration = 60;

let isRunning = false;
let runningSince = 0;
const MAX_RUN_MS = 5 * 60 * 1000;

// Отдельный крон — раньше мировые источники (RemoteOK, WWR, Remotive,
// Himalayas) шли в одном запросе вместе с RU-источниками. Чистка по
// возрасту уже происходит в /api/cron/parse-vacancies (RU) раз за цикл,
// здесь дублировать её не нужно.

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
    const added = await runWorldVacancyParsers();

    return NextResponse.json({
      success: true,
      added,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron vacancies world] Ошибка:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
