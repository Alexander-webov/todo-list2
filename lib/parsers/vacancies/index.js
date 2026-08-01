import { parseHH } from './hh.js';
import { parseAvito } from './avito.js';
import { parseTrudvsem } from './trudvsem.js';
import { parseHabrCareer } from './habrcareer.js';
import { parseRemoteOK } from './remoteok.js';
import { parseWWR } from './wwr.js';
import { parseRemotive } from './remotive.js';
import { parseHimalayas } from './himalayas.js';
import { supabaseAdmin } from '../../supabase.js';
import { RU_VACANCY_SOURCES, WORLD_VACANCY_SOURCES, VACANCY_SOURCES } from '../../vacancySources.js';

export { RU_VACANCY_SOURCES, WORLD_VACANCY_SOURCES, VACANCY_SOURCES };

async function saveVacancies(list) {
  console.log(`[VacancyParsers] Собрано: ${list.length}`);
  if (list.length === 0) return 0;

  const db = supabaseAdmin();
  const { data: inserted, error } = await db
    .from('vacancies')
    .upsert(list, { onConflict: 'source,external_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[VacancyParsers] Ошибка сохранения:', error.message);
    return 0;
  }

  const newCount = inserted?.length || 0;
  console.log(`[VacancyParsers] Новых в БД: ${newCount}`);
  return newCount;
}

const log = (name, r) => {
  if (r.status === 'fulfilled') console.log(`[${name}] ✓ ${r.value.length}`);
  else console.error(`[${name}] ✗`, r.reason?.message);
};

// Раньше был один общий крон на все 8 источников — у cron-job.org жёсткий,
// не настраиваемый лимит в 30 секунд на ответ (это не зависит от хостинга
// и не увеличивается ни в каких настройках), и суммарного времени на все
// источники сразу стало не хватать. Разбили на два отдельных крона —
// каждый по отдельности гарантированно укладывается с запасом, независимо
// от того, сколько источников добавится в будущем.

export async function runRuVacancyParsers() {
  console.log('[VacancyParsers:RU] Запуск...');

  const [hh, avito, trudvsem, habrcareer] = await Promise.allSettled([
    parseHH(),
    parseAvito(),
    parseTrudvsem(),
    parseHabrCareer(),
  ]);

  log('HH.ru', hh);
  log('Avito', avito);
  log('Trudvsem', trudvsem);
  log('HabrCareer', habrcareer);

  const fulfilled = (r) => r.status === 'fulfilled' ? r.value : [];
  return saveVacancies([
    ...fulfilled(hh),
    ...fulfilled(avito),
    ...fulfilled(trudvsem),
    ...fulfilled(habrcareer),
  ]);
}

export async function runWorldVacancyParsers() {
  console.log('[VacancyParsers:World] Запуск...');

  const [remoteok, wwr, remotive, himalayas] = await Promise.allSettled([
    parseRemoteOK(),
    parseWWR(),
    parseRemotive(),
    parseHimalayas(),
  ]);

  log('RemoteOK', remoteok);
  log('WeWorkRemotely', wwr);
  log('Remotive', remotive);
  log('Himalayas', himalayas);

  const fulfilled = (r) => r.status === 'fulfilled' ? r.value : [];
  return saveVacancies([
    ...fulfilled(remoteok),
    ...fulfilled(wwr),
    ...fulfilled(remotive),
    ...fulfilled(himalayas),
  ]);
}

// Оставлена для обратной совместимости (например, ручного локального теста
// всех источников сразу) — в реальных кронах используем раздельные функции.
export async function runAllVacancyParsers() {
  const [ru, world] = await Promise.all([runRuVacancyParsers(), runWorldVacancyParsers()]);
  return ru + world;
}
