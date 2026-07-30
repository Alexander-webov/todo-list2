import { parseHH } from './hh.js';
import { parseAvito } from './avito.js';
import { parseRemoteOK } from './remoteok.js';
import { parseWWR } from './wwr.js';
import { parseRemotive } from './remotive.js';
import { supabaseAdmin } from '../../supabase.js';

export const RU_VACANCY_SOURCES = ['hh', 'avito'];
export const WORLD_VACANCY_SOURCES = ['remoteok', 'wwr', 'remotive'];

export const VACANCY_SOURCES = {
  hh:       { name: 'HH.ru',           flag: '🇷🇺', color: '#d6001c', region: 'ru' },
  avito:    { name: 'Avito Работа',    flag: '🇷🇺', color: '#00aaff', region: 'ru' },
  remoteok: { name: 'RemoteOK',        flag: '🌍', color: '#f8405a', region: 'world' },
  wwr:      { name: 'WeWorkRemotely',  flag: '🌍', color: '#3c3c3c', region: 'world' },
  remotive: { name: 'Remotive',        flag: '🌍', color: '#4a4a4a', region: 'world' },
};

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
