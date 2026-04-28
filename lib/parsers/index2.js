import { parseFL } from './fl.js';
import { parseKwork } from './kwork.js';
import { parseFreelanceRu } from './freelanceru.js';
import { parseYoudo } from './youdo.js';
/* import { parseUpwork } from './upwork.js'; */
import { parseFreelancer } from './freelancer.js';
import { parsePeoplePerHour } from './peopleperhour.js';
import { parseGuru } from './guru.js';
import { supabaseAdmin } from '../supabase.js';
import { sendNewProjectNotifications } from '../telegram.js';

export const RU_SOURCES = ['fl', 'kwork', 'freelanceru', 'youdo'];
export const INT_SOURCES = ['upwork', 'freelancer', 'peopleperhour', 'guru'];

export async function runAllParsers() {
  console.log('[Parsers] Запуск...');

  const [fl, kwork, freelanceru, youdo] = await Promise.allSettled([
    parseFL(),
    parseKwork(),
    parseFreelanceRu(),
    parseYoudo(),
  ]);

  const [/* upwork, */ freelancer, pph, guru] = await Promise.allSettled([
    /*   parseUpwork(), */
    parseFreelancer(),
    parsePeoplePerHour(),
    parseGuru(),
  ]);

  const log = (name, r) => {
    if (r.status === 'fulfilled') console.log(`[${name}] ✓ ${r.value.length}`);
    else console.error(`[${name}] ✗`, r.reason?.message);
  };
  log('FL.ru', fl);
  log('Kwork', kwork);
  log('Freelance.ru', freelanceru);
  log('Youdo', youdo);
  /*   log('Upwork', upwork); */
  log('Freelancer', freelancer);
  log('PeoplePerHour', pph);
  log('Guru', guru);

  const fulfilled = (r) => r.status === 'fulfilled' ? r.value : [];

  const allProjects = [
    ...fulfilled(fl),
    ...fulfilled(kwork),
    ...fulfilled(freelanceru),
    ...fulfilled(youdo),
    ...fulfilled(upwork),
    ...fulfilled(freelancer),
    ...fulfilled(pph),
    ...fulfilled(guru),
  ];

  console.log(`[Parsers] Всего собрано: ${allProjects.length}`);
  if (allProjects.length === 0) return 0;

  const db = supabaseAdmin();

  let newProjects = [];

  if (allProjects.length > 0) {
    const { data: inserted, error } = await db
      .from('projects')
      .upsert(allProjects, { onConflict: 'source,external_id', ignoreDuplicates: true })
      .select('id, source, title, category, budget_min, currency, url');
    if (error) console.error('[Parsers] Ошибка сохранения:', error.message);
    else newProjects = inserted || [];
  }

  console.log(`[Parsers] Новых в БД: ${newProjects.length}`);

  if (newProjects.length > 0) {
    await sendNewProjectNotifications(newProjects).catch(e =>
      console.error('[Telegram] Ошибка:', e.message)
    );
  }

  return newProjects.length;
}

export const SOURCES = {
  fl: { name: 'FL.ru', flag: '🇷🇺', color: '#f60', region: 'ru' },
  kwork: { name: 'Kwork', flag: '🇷🇺', color: '#ff4d00', region: 'ru' },
  freelanceru: { name: 'Freelance.ru', flag: '🇷🇺', color: '#2ecc71', region: 'ru' },
  youdo: { name: 'Youdo', flag: '🇷🇺', color: '#7c3aed', region: 'ru' },
  upwork: { name: 'Upwork', flag: '🌐', color: '#14a800', region: 'int' },
  freelancer: { name: 'Freelancer.com', flag: '🌐', color: '#29b2fe', region: 'int' },
  peopleperhour: { name: 'PeoplePerHour', flag: '🌐', color: '#f7931a', region: 'int' },
  guru: { name: 'Guru.com', flag: '🌐', color: '#5b3cc4', region: 'int' },
};
