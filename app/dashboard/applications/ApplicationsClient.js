'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './applications.module.css';

const STATUS_LABELS = {
  sent: { label: 'Отправлен', color: '#5680cf' },
  responded: { label: 'Ответили', color: '#a78bfa' },
  accepted: { label: 'Взяли в работу', color: '#22c55e' },
  rejected: { label: 'Отказ', color: '#ef4444' },
  closed_lost: { label: 'Не вышло', color: '#97a2b5' },
};

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'sent', label: 'Отправлены' },
  { value: 'responded', label: 'Ответили' },
  { value: 'accepted', label: 'Взяли в работу' },
  { value: 'rejected', label: 'Отказ' },
  { value: 'closed_lost', label: 'Не вышло' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ApplicationsClient() {
  const [filter, setFilter] = useState('');
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/applications/list?${params.toString()}`);
      const data = await res.json();
      setApps(data.applications || []);
      setTotal(data.total || 0);
    } catch {
      setApps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(app, status) {
    if (!app.project_id) return; // старая запись без живого project_id — не обновить
    setSavingId(app.id);
    try {
      await fetch('/api/applications/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: app.project_id, status }),
      });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/dashboard" className={styles.back}>← В аккаунт</a>
      </div>

      <h1 className={styles.title}>Мои отклики</h1>
      <p className={styles.sub}>
        {loading ? 'Загрузка…' : `${total.toLocaleString('ru')} откликов`}
      </p>

      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>Загрузка…</div>
      ) : apps.length === 0 ? (
        <div className={styles.empty}>
          Пока пусто. Отклики на проекты появятся здесь автоматически.
        </div>
      ) : (
        <div className={styles.list}>
          {apps.map(app => {
            const statusInfo = STATUS_LABELS[app.status] || STATUS_LABELS.sent;
            return (
              <div key={app.id} className={styles.card}>
                <div className={styles.cardTop}>
                  {app.url ? (
                    <a href={app.url} target="_blank" rel="noopener noreferrer" className={styles.cardTitle}>
                      {app.title || 'Проект без названия'}
                    </a>
                  ) : (
                    <span className={styles.cardTitle}>{app.title || 'Проект без названия'}</span>
                  )}
                  <span className={styles.cardDate}>{formatDate(app.created_at)}</span>
                </div>

                <div className={styles.cardMeta}>
                  {app.source && <span className={styles.metaTag}>{app.source}</span>}
                  {app.project_budget && (
                    <span className={styles.metaTag}>от {Number(app.project_budget).toLocaleString('ru')} ₽</span>
                  )}
                  {app.used_ai && <span className={styles.metaTag}>✨ AI-отклик</span>}
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.statusBadge} style={{ '--status-color': statusInfo.color }}>
                    {statusInfo.label}
                  </span>

                  {app.project_id ? (
                    <select
                      className={styles.statusSelect}
                      value={app.status || 'sent'}
                      disabled={savingId === app.id}
                      onChange={(e) => updateStatus(app, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={styles.archivedNote}>Проект больше не в базе</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
