'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './RespondedClient.module.css';

const SOURCE_NAMES = {
  fl: 'FL.ru', kwork: 'Kwork', freelanceru: 'Freelance.ru', youdo: 'Youdo',
  upwork: 'Upwork', freelancer: 'Freelancer.com',
  peopleperhour: 'PeoplePerHour', guru: 'Guru.com',
};

const STATUS_OPTIONS = [
  { key: 'sent', label: 'Отправил, жду', emoji: '📤', color: '#6b7280' },
  { key: 'responded', label: 'Заказчик ответил', emoji: '💬', color: '#3b82f6' },
  { key: 'accepted', label: 'Взяли в работу', emoji: '✅', color: '#22c55e' },
  { key: 'rejected', label: 'Отказали', emoji: '❌', color: '#ef4444' },
];

function timeFmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function budgetFmt(p) {
  if (!p.budget_min && !p.budget_max) return null;
  const sym = p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : '₽';
  const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n;
  if (p.budget_min && p.budget_max) return `${sym}${fmt(p.budget_min)}—${sym}${fmt(p.budget_max)}`;
  if (p.budget_min) return `от ${sym}${fmt(p.budget_min)}`;
  return `до ${sym}${fmt(p.budget_max)}`;
}

export function RespondedClient({ project, isLoggedIn, userId }) {
  // Таймер на 20 минут — сколько ты там пишешь отклик
  const [remaining, setRemaining] = useState(20 * 60);
  const [returnedBack, setReturnedBack] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [statusChosen, setStatusChosen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedToFavs, setSavedToFavs] = useState(false);
  const [wasHidden, setWasHidden] = useState(false);
  const timerRef = useRef(null);

  // Загружаем похожие проекты
  useEffect(() => {
    fetch(`/api/projects/${project.id}/similar`)
      .then(r => r.json())
      .then(d => setSimilar(d.projects || []))
      .catch(() => { });
  }, [project.id]);

  // Таймер
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Определяем "вернулся ли" — когда вкладка снова становится видимой
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'hidden') {
        setWasHidden(true);
      } else if (document.visibilityState === 'visible' && wasHidden) {
        setReturnedBack(true);
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [wasHidden]);

  async function markStatus(newStatus) {
    if (!isLoggedIn) return;
    setSaving(true);
    setStatusChosen(newStatus);
    try {
      await fetch('/api/applications/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, status: newStatus }),
      });
    } catch { }
    setSaving(false);
  }

  async function saveToFavs() {
    if (!isLoggedIn) return;
    setSavedToFavs(true);
    try {
      await fetch('/api/saved-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      });
    } catch { }
  }

  const source = SOURCE_NAMES[project.source] || project.source;
  const budget = budgetFmt(project);

  return (
    <>
      {/* Hero с таймером */}
      <div className={styles.hero}>
        <div className={styles.heroCheck}>✓</div>
        <h1 className={styles.heroTitle}>
          {returnedBack ? 'С возвращением!' : 'Отлично, отправили тебя на биржу'}
        </h1>
        <p className={styles.heroSub}>
          {returnedBack
            ? 'Пока ты там был, мы подготовили следующие шаги ↓'
            : <>Ты откликаешься на <b>{source}</b>. Не закрывай эту вкладку — когда вернёшься, отметь результат.</>
          }
        </p>

        <a
          href='/'
          rel="noopener noreferrer"
          className={styles.heroBack}
        >
          ← Найти еще проект
        </a>

        {remaining > 0 && !returnedBack && (
          <div className={styles.timerRow}>
            <div className={styles.timerText}>
              ⏱ Следующий отклик через <b>{timeFmt(remaining)}</b>
            </div>
            <div className={styles.timerBar}>
              <div
                className={styles.timerFill}
                style={{ width: `${(remaining / (20 * 60)) * 100}%` }}
              />
            </div>
            <div className={styles.timerHint}>
              По статистике качественный отклик пишется 15–20 минут. Не спеши.
            </div>
          </div>
        )}
      </div>

      {/* Блок статуса отклика — для залогиненных */}
      {isLoggedIn && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Отметь результат</h2>
          <p className={styles.sectionSub}>
            Это нужно только тебе — мы посчитаем твою конверсию и подскажем что улучшить.
            За отметку «Получил ответ» +20 XP, за «Взяли в работу» +50 XP.
          </p>
          <div className={styles.statusRow}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => markStatus(opt.key)}
                disabled={saving}
                className={`${styles.statusBtn} ${statusChosen === opt.key ? styles.statusBtnActive : ''}`}
                style={statusChosen === opt.key ? { borderColor: opt.color, color: opt.color } : {}}
              >
                <span className={styles.statusEmoji}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          {statusChosen && (
            <div className={styles.statusConfirm}>
              ✓ Сохранено. Увидишь в своей статистике откликов.
            </div>
          )}
        </section>
      )}

      {/* Блок регистрации — для анонимов */}
      {!isLoggedIn && (
        <section className={`${styles.section} ${styles.cta}`}>
          <h2 className={styles.sectionTitle}>Хочешь видеть свою конверсию откликов?</h2>
          <p className={styles.sectionSub}>
            Зарегистрируйся бесплатно — будем считать сколько откликов превращаются
            в ответы и сделки. По статистике это ускоряет рост дохода в 2–3 раза,
            потому что ты понимаешь что работает.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/register" className={styles.ctaPrimary}>
              Зарегистрироваться за 10 сек →
            </Link>
            <Link href={`/projects/${project.id}`} className={styles.ctaSecondary}>
              Сначала вернуться к проекту
            </Link>
          </div>
        </section>
      )}

      {/* Сохранить в избранное */}
      {isLoggedIn && (
        <section className={styles.section}>
          <button
            onClick={saveToFavs}
            disabled={savedToFavs}
            className={styles.saveBtn}
          >
            {savedToFavs ? '⭐ Сохранено в избранное' : '☆ Сохранить проект в избранное'}
          </button>
        </section>
      )}

      {/* Похожие заказы */}
      {similar.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Пока пишешь — зацени эти {project.category ? `· ${project.category}` : ''}
          </h2>
          <p className={styles.sectionSub}>
            Те же теги, свежие. Отклик на несколько проектов сразу даёт в 3–4 раза больше ответов.
          </p>
          <div className={styles.similarGrid}>
            {similar.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={styles.similarCard}
              >
                <div className={styles.similarTop}>
                  <span className={styles.similarSource}>
                    {SOURCE_NAMES[p.source] || p.source}
                  </span>
                  {budgetFmt(p) && (
                    <span className={styles.similarBudget}>{budgetFmt(p)}</span>
                  )}
                </div>
                <h3 className={styles.similarTitle}>{p.title}</h3>
                {p.description && (
                  <p className={styles.similarDesc}>{p.description.slice(0, 120)}…</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Возврат в ленту */}
      <div className={styles.backRow}>
        <Link href="/" className={styles.backBtn}>
          ← Вернуться в ленту заказов
        </Link>
      </div>
    </>
  );
}
