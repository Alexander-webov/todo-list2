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

export async function runAllVacancyParsers() {
  console.log('[VacancyParsers] Запуск...');

  const [hh, avito, trudvsem, habrcareer] = await Promise.allSettled([
    parseHH(),
    parseAvito(),
    parseTrudvsem(),
    parseHabrCareer(),
  ]);

  const [remoteok, wwr, remotive, himalayas] = await Promise.allSettled([
    parseRemoteOK(),
    parseWWR(),
    parseRemotive(),
    parseHimalayas(),
  ]);

  const log = (name, r) => {
    if (r.status === 'fulfilled') console.log(`[${name}] ✓ ${r.value.length}`);
    else console.error(`[${name}] ✗`, r.reason?.message);
  };
  log('HH.ru', hh);
  log('Avito', avito);
  log('Trudvsem', trudvsem);
  log('HabrCareer', habrcareer);
  log('RemoteOK', remoteok);
  log('WeWorkRemotely', wwr);
  log('Remotive', remotive);
  log('Himalayas', himalayas);

  const fulfilled = (r) => r.status === 'fulfilled' ? r.value : [];

  const allVacancies = [
    ...fulfilled(hh),
    ...fulfilled(avito),
    ...fulfilled(trudvsem),
    ...fulfilled(habrcareer),
    ...fulfilled(remoteok),
    ...fulfilled(wwr),
    ...fulfilled(remotive),
    ...fulfilled(himalayas),
  ];

  console.log(`[VacancyParsers] Всего собрано: ${allVacancies.length}`);
  if (allVacancies.length === 0) return 0;

  const db = supabaseAdmin();

  const { data: inserted, error } = await db
    .from('vacancies')
    .upsert(allVacancies, { onConflict: 'source,external_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[VacancyParsers] Ошибка сохранения:', error.message);
    return 0;
  }

  const newCount = inserted?.length || 0;
  console.log(`[VacancyParsers] Новых в БД: ${newCount}`);
  return newCount;
}
