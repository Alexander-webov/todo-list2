'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './queue.module.css';

export function TelegramQueueClient() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [sRes, stRes] = await Promise.all([
        fetch('/api/admin/telegram-queue/settings').then(r => r.json()),
        fetch('/api/admin/telegram-queue/stats').then(r => r.json()),
      ]);
      if (sRes.settings) setSettings(sRes.settings);
      if (!stRes.error) setStats(stRes);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // автообновление каждые 10 сек
    return () => clearInterval(t);
  }, [load]);

  async function save(patch) {
    if (!settings) return;
    setSaving(true);
    // Оптимистичное обновление UI
    setSettings(prev => ({ ...prev, ...patch }));
    try {
      const res = await fetch('/api/admin/telegram-queue/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setToast({ ok: true, msg: 'Сохранено' });
      } else {
        setToast({ ok: false, msg: data.error || 'Ошибка' });
      }
    } catch {
      setToast({ ok: false, msg: 'Ошибка сети' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2000);
    }
  }

  async function clearPending() {
    if (!confirm('Удалить все ожидающие публикации из очереди? Действие нельзя отменить.')) return;
    try {
      const res = await fetch('/api/admin/telegram-queue/stats?action=clear_pending', { method: 'POST' });
      const data = await res.json();
      setToast({ ok: !data.error, msg: data.error ? data.error : `Очищено: ${data.cleared}` });
      setTimeout(() => setToast(null), 2500);
      load();
    } catch {
      setToast({ ok: false, msg: 'Ошибка сети' });
    }
  }

  if (!settings || !stats) {
    return <div className={styles.page}><div className={styles.loading}>Загрузка…</div></div>;
  }

  const postsPerDay = settings.posts_per_hour * 24;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.back}>← Админка</Link>
        <h1 className={styles.title}>Telegram: очередь и постинг</h1>
      </div>

      {/* Статус / СТАРТ-СТОП */}
      <div className={`${styles.card} ${settings.is_enabled ? styles.cardOn : styles.cardOff}`}>
        <div className={styles.statusRow}>
          <div>
            <div className={styles.statusLabel}>
              Постинг {settings.is_enabled
                ? <span className={styles.statusOn}>активен</span>
                : <span className={styles.statusOff}>остановлен</span>}
            </div>
            <div className={styles.statusHint}>
              {settings.is_enabled
                ? 'Бот публикует в каналы по расписанию. Очередь продолжает заполняться парсерами.'
                : 'Публикация в каналы приостановлена. Парсеры продолжают копить очередь.'}
            </div>
          </div>
          <button
            onClick={() => save({ is_enabled: !settings.is_enabled })}
            disabled={saving}
            className={`${styles.toggleBtn} ${settings.is_enabled ? styles.toggleBtnStop : styles.toggleBtnStart}`}
          >
            {settings.is_enabled ? '⏸ СТОП' : '▶ СТАРТ'}
          </button>
        </div>
      </div>

      {/* Постов в сутки */}
      <div className={styles.card}>
        <div className={styles.sliderHead}>
          <span className={styles.sliderLabel}>Лимит постов</span>
          <span className={styles.sliderValue}>
            {settings.posts_per_hour} <small>/ час</small>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={settings.posts_per_hour}
          onChange={e => save({ posts_per_hour: +e.target.value })}
          className={styles.slider}
        />
        <div className={styles.sliderMeta}>
          <span>~{postsPerDay} постов в сутки</span>
          <span className={styles.sliderRange}>1 – 20 / час</span>
        </div>
      </div>

      {/* Минимальный score */}
      <div className={styles.card}>
        <div className={styles.sliderHead}>
          <span className={styles.sliderLabel}>Минимальный качественный score</span>
          <span className={styles.sliderValue}>{settings.min_score}</span>
        </div>
        <input
          type="range"
          min={-10}
          max={80}
          step={1}
          value={settings.min_score}
          onChange={e => save({ min_score: +e.target.value })}
          className={styles.slider}
        />
        <div className={styles.hint}>
          Проекты с оценкой ниже — в канал не попадут. Подними если в канале много мусора.
          Ориентиры: <b>0</b> — почти всё публикуется, <b>15</b> — только с бюджетом ≥10к, <b>30</b> — только жирные заказы.
        </div>
      </div>

      {/* Протухание */}
      <div className={styles.card}>
        <div className={styles.sliderHead}>
          <span className={styles.sliderLabel}>Протухание в очереди</span>
          <span className={styles.sliderValue}>{settings.max_queue_age_hours} <small>ч</small></span>
        </div>
        <input
          type="range"
          min={1}
          max={24}
          value={settings.max_queue_age_hours}
          onChange={e => save({ max_queue_age_hours: +e.target.value })}
          className={styles.slider}
        />
        <div className={styles.hint}>
          Проекты старше этого времени не публикуются, даже если набрали высокий score.
        </div>
      </div>

      {/* Статистика */}
      <h2 className={styles.sectionTitle}>Статистика</h2>
      <div className={styles.statsGrid}>
        <Stat label="В очереди" value={stats.pending} sub={`RU ${stats.pendingRu} · INT ${stats.pendingInt}`} />
        <Stat label="За час" value={stats.postedLastHour} sub="опубликовано" />
        <Stat label="За сутки" value={stats.postedToday} sub={`RU ${stats.postedTodayRu} · INT ${stats.postedTodayInt}`} />
        <Stat label="Средний score" value={stats.avgScoreToday} sub="за сутки" />
      </div>

      {/* Последние посты */}
      {stats.recent?.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Последние публикации</h2>
          <div className={styles.recentList}>
            {stats.recent.map((r, i) => (
              <div key={i} className={styles.recentRow}>
                <div className={styles.recentLeft}>
                  <div className={styles.recentSource}>
                    <span className={styles.recentChannel}>{r.target_channel === 'ru' ? '🇷🇺' : '🌐'}</span>
                    {r.source} · {r.category || '—'}
                  </div>
                  <div className={styles.recentTime}>
                    {new Date(r.posted_at).toLocaleString('ru')}
                  </div>
                </div>
                <div className={styles.recentScore}>score {r.score ?? '—'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Экстренные действия */}
      <h2 className={styles.sectionTitle}>Экстренные действия</h2>
      <div className={styles.card}>
        <button onClick={clearPending} className={styles.dangerBtn}>
          Очистить очередь ({stats.pending} pending)
        </button>
        <div className={styles.hint}>
          Пометит все ожидающие публикации как skipped. Парсеры продолжат работать.
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}
