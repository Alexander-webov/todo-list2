'use client';
import { useState } from 'react';
import styles from './CustomerBadge.module.css';

function ReliabilityBar({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f5a623' : '#ef4444';
  const label = score >= 70 ? 'Надёжный' : score >= 40 ? 'Средний' : 'Новый';
  return (
    <div className={styles.reliability}>
      <div className={styles.reliabilityBar}>
        <div className={styles.reliabilityFill} style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ color, fontSize: 11 }}>{label} {score}%</span>
    </div>
  );
}

export function CustomerBadge({ customerId, source }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (customer || !customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customer?external_id=${customerId}&source=${source}`);
      const data = await res.json();
      setCustomer(data.customer);
    } catch (_) {}
    setLoading(false);
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  if (!customerId) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.trigger} onClick={toggle}>
        👤 Заказчик
      </button>
      {open && (
        <div className={styles.popup}>
          {loading && <p className={styles.loading}>Загрузка...</p>}
          {!loading && !customer && <p className={styles.empty}>Новый заказчик — данных пока нет</p>}
          {!loading && customer && (
            <>
              {customer.name && <p className={styles.name}>{customer.name}</p>}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statVal}>{customer.total_projects}</span>
                  <span className={styles.statLabel}>проектов</span>
                </div>
                {customer.avg_budget > 0 && (
                  <div className={styles.stat}>
                    <span className={styles.statVal}>₽{(customer.avg_budget / 1000).toFixed(0)}k</span>
                    <span className={styles.statLabel}>средний бюджет</span>
                  </div>
                )}
              </div>
              {customer.preferred_categories?.length > 0 && (
                <div className={styles.cats}>
                  {customer.preferred_categories.map(c => (
                    <span key={c} className={styles.cat}>{c}</span>
                  ))}
                </div>
              )}
              <ReliabilityBar score={customer.reliability_score} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
