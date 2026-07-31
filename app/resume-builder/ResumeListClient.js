'use client';
import { useState, useEffect } from 'react';
import styles from './resume-builder.module.css';

export function ResumeListClient() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [needsCredits, setNeedsCredits] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    fetch('/api/resumes')
      .then(r => r.json())
      .then(d => setResumes(d.resumes || []))
      .finally(() => setLoading(false));
  }, []);

  async function createResume() {
    setCreating(true);
    setError('');
    setNeedsCredits(false);
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'ru', data: {} }),
      });
      const data = await res.json();
      if (res.status === 402 || data.credits_required) {
        setNeedsCredits(true);
        setError(data.error);
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Не удалось создать резюме');
        return;
      }
      window.location.href = `/resume-builder/${data.resume.id}`;
    } catch {
      setError('Ошибка соединения');
    } finally {
      setCreating(false);
    }
  }

  async function buySlots() {
    setBuyLoading(true);
    try {
      const res = await fetch('/api/payment/yookassa/create-resume-credits', { method: 'POST' });
      const data = await res.json();
      const redirectUrl = data.confirmation_url || data.url;
      if (redirectUrl) window.location.href = redirectUrl;
      else { setError(data.error || 'Не удалось создать платёж'); setBuyLoading(false); }
    } catch {
      setError('Ошибка соединения');
      setBuyLoading(false);
    }
  }

  async function deleteResume(id) {
    if (!confirm('Удалить это резюме?')) return;
    await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
    setResumes(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.badge}>📄 Конструктор резюме</span>
        <h1 className={styles.title}>Резюме под Россию или США/Европу</h1>
        <p className={styles.sub}>
          Разные страны — разные ожидания от резюме. AI подскажет формулировки под каждый раздел.
          Первое резюме бесплатно.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
          Дальше — 10 дополнительных резюме за 499 ₽. Без подписки, разовая покупка.
        </p>
      </div>

      {loading ? (
        <div className={styles.empty}>Загрузка…</div>
      ) : (
        <>
          {resumes.length > 0 && (
            <div className={styles.list}>
              {resumes.map(r => (
                <div key={r.id} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardCountry}>{r.country === 'intl' ? '🌍 США / Европа' : '🇷🇺 Россия'}</span>
                    <span className={styles.cardName}>{r.data?.fullName || 'Без имени'}</span>
                    <span className={styles.cardRole}>{r.data?.targetRole || 'Должность не указана'}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <a href={`/resume-builder/${r.id}`} className={styles.cardBtn}>Редактировать</a>
                    <a href={`/resume-builder/${r.id}/print`} className={styles.cardBtnGhost}>Печать</a>
                    <button onClick={() => deleteResume(r.id)} className={styles.cardDelete}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className={styles.createBtn} onClick={createResume} disabled={creating}>
            {creating ? '...' : '+ Создать резюме'}
          </button>

          {error && <p className={styles.error}>{error}</p>}

          {needsCredits && (
            <div className={styles.buyBox}>
              <h3>Бесплатное резюме уже использовано</h3>
              <p>Дополнительные слоты — пакетами по 10 штук.</p>
              <button className={styles.buyBtn} onClick={buySlots} disabled={buyLoading}>
                {buyLoading ? '...' : '10 резюме за 499 ₽'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
                Оплачивая, вы соглашаетесь с <a href="/terms" style={{ color: 'var(--accent)' }}>условиями использования</a>.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
