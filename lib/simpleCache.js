// lib/simpleCache.js — маленький in-memory TTL-кэш с ограничением размера.
//
// Зачем: в нескольких местах (главная лента, /api/projects, /api/vacancies)
// стоял просто `new Map()`, куда клался ответ на каждую уникальную комбинацию
// фильтров (в т.ч. свободный текст поиска). Такой Map никогда не чистился —
// устаревшие по TTL записи просто игнорировались при чтении, но не удалялись
// физически. За недели работы на живом трафике с поиском это медленно, но
// верно съедало память процесса (в Node/Railway процесс живёт долго, это не
// serverless с холодным стартом каждый раз).
//
// createTTLCache даёт тот же интерфейс (get/set), но:
//   1. При чтении устаревшая запись реально удаляется, а не просто игнорится.
//   2. Размер ограничен maxSize — при превышении вытесняется САМАЯ старая
//      запись (Map сохраняет порядок вставки, так что это дёшево и без
//      отдельной LRU-структуры).

export function createTTLCache(ttlMs, maxSize = 200) {
  const map = new Map();

  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) {
        map.delete(key);
        return undefined;
      }
      return hit.body;
    },
    set(key, body) {
      if (map.size >= maxSize && !map.has(key)) {
        const oldestKey = map.keys().next().value;
        if (oldestKey !== undefined) map.delete(oldestKey);
      }
      map.set(key, { at: Date.now(), body });
    },
    get size() {
      return map.size;
    },
  };
}
