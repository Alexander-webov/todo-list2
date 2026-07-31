import { parseHH } from './hh.js';
import { parseAvito } from './avito.js';
import { parseRemoteOK } from './remoteok.js';
import { parseWWR } from './wwr.js';
import { parseRemotive } from './remotive.js';
import { supabaseAdmin } from '../../supabase.js';
import { RU_VACANCY_SOURCES, WORLD_VACANCY_SOURCES, VACANCY_SOURCES } from '../../vacancySources.js';

export { RU_VACANCY_SOURCES, WORLD_VACANCY_SOURCES, VACANCY_SOURCES };

export async function runAllVacancyParsers() {
  console.log('[VacancyParsers] Запуск...');

  const [hh, avito] = await Promise.allSettled([
    parseHH(),
    parseAvito(),
  ]);

  const [remoteok, wwr, remotive] = await Promise.allSettled([
    parseRemoteOK(),
    parseWWR(),
    parseRemotive(),
  ]);

  const log = (name, r) => {
    if (r.status === 'fulfilled') console.log(`[${name}] ✓ ${r.value.length}`);
    else console.error(`[${name}] ✗`, r.reason?.message);
  };
  log('HH.ru', hh);
  log('Avito', avito);
  log('RemoteOK', remoteok);
  log('WeWorkRemotely', wwr);
  log('Remotive', remotive);

  const fulfilled = (r) => r.status === 'fulfilled' ? r.value : [];

  const allVacancies = [
    ...fulfilled(hh),
    ...fulfilled(avito),
    ...fulfilled(remoteok),
    ...fulfilled(wwr),
    ...fulfilled(remotive),
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
