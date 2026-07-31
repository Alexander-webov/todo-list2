// lib/vacancySources.js — чистые данные об источниках вакансий, без единого
// server-only импорта (axios/cheerio/rss-parser/supabaseAdmin).
//
// Раньше это жило в lib/parsers/vacancies/index.js, а его импортировал
// components/VacancyCard.js — клиентский компонент ('use client'). Из-за
// этого весь серверный пайплайн парсинга (включая cheerio и rss-parser,
// которые в next.config.js явно помечены как serverComponentsExternalPackages,
// то есть предназначены только для серверных компонентов) утягивался в
// клиентский бандл. На проде это ломало сборку модуля для /remote-work —
// компонент резолвился в undefined ("Element type is invalid... got undefined").
//
// lib/parsers/vacancies/index.js теперь реэкспортирует эти же константы
// отсюда, так что серверный код, который их импортировал, ничего не заметил.

export const RU_VACANCY_SOURCES = ['hh', 'avito', 'trudvsem', 'habrcareer'];
export const WORLD_VACANCY_SOURCES = ['remoteok', 'wwr', 'remotive', 'himalayas'];

export const VACANCY_SOURCES = {
  trudvsem:   { name: 'Работа России',   flag: '🇷🇺', color: '#0039a6', region: 'ru' },
  hh:         { name: 'HH.ru',           flag: '🇷🇺', color: '#d6001c', region: 'ru' },
  avito:      { name: 'Avito Работа',    flag: '🇷🇺', color: '#00aaff', region: 'ru' },
  habrcareer: { name: 'Хабр Карьера',    flag: '🇷🇺', color: '#65a3be', region: 'ru' },
  remoteok:   { name: 'RemoteOK',        flag: '🌍', color: '#f8405a', region: 'world' },
  wwr:        { name: 'WeWorkRemotely',  flag: '🌍', color: '#3c3c3c', region: 'world' },
  remotive:   { name: 'Remotive',        flag: '🌍', color: '#4a4a4a', region: 'world' },
  himalayas:  { name: 'Himalayas',       flag: '🌍', color: '#5b8def', region: 'world' },
};
