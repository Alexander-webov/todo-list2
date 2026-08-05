'use client';
import { useState, useEffect } from 'react';
import styles from './review.module.css';

function ProofView({ lesson }) {
  const taskType = lesson.taskType || lesson.task_type;
  if (!lesson.completedAt && !lesson.completed_at) {
    return <p className={styles.proofPending}>— ещё не пройден —</p>;
  }
  if (taskType === 'text_input') {
    return <p className={styles.proofText}>{lesson.proof?.text || <em>— не заполнено —</em>}</p>;
  }
  if (taskType === 'exchange_links') {
    const clicked = lesson.proof?.clicked || [];
    return <p className={styles.proofText}>Перешёл на: {clicked.length ? clicked.join(', ') : <em>ничего</em>}</p>;
  }
  if (taskType === 'project_click_check') {
    return <p className={styles.proofText}>✓ Подтверждено автоматически (был переход на проект через сайт)</p>;
  }
  return <p className={styles.proofText}>✓ Отмечено пользователем (без проверяемых данных)</p>;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function CoursesReviewClient() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'progress'
  const [submissions, setSubmissions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/courses/pending').then(r => r.json()),
      fetch('/api/admin/courses/in-progress').then(r => r.json()),
    ])
      .then(([pendingData, progressData]) => {
        setSubmissions(pendingData.submissions || []);
        setProgress(progressData.progress || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function review(id, action) {
    setBusyId(id);
    try {
      await fetch('/api/admin/courses/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, action }),
      });
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/admin" className={styles.back}>← Admin</a>
        <h1 className={styles.title}>Курсы</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`} onClick={() => setTab('pending')}>
          На проверке {submissions.length > 0 && `(${submissions.length})`}
        </button>
        <button className={`${styles.tab} ${tab === 'progress' ? styles.tabActive : ''}`} onClick={() => setTab('progress')}>
          Все в процессе {progress.length > 0 && `(${progress.length})`}
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : tab === 'pending' ? (
        submissions.length === 0 ? (
          <p className={styles.empty}>Заявок на проверку нет — либо ещё никто не закончил курс целиком, либо все уже проверены.</p>
        ) : (
          <div className={styles.list}>
            {submissions.map(sub => (
              <div key={sub.id} className={styles.card}>
                <div className={styles.cardHeader} onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                  <div>
                    <p className={styles.userEmail}>{sub.userEmail}</p>
                    <p className={styles.courseTitle}>{sub.courseTitle} · +{sub.rewardAmount} ₽ · {fmtDate(sub.submittedAt)}</p>
                  </div>
                  <span className={styles.expandIcon}>{expandedId === sub.id ? '−' : '+'}</span>
                </div>

                {expandedId === sub.id && (
                  <div className={styles.lessonsList}>
                    {sub.lessons.map((l, i) => (
                      <div key={i} className={styles.lessonBlock}>
                        <p className={styles.lessonTitle}>{i + 1}. {l.title}</p>
                        <ProofView lesson={l} />
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  <button className={styles.approveBtn} disabled={busyId === sub.id} onClick={() => review(sub.id, 'approve')}>
                    ✓ Одобрить
                  </button>
                  <button className={styles.rejectBtn} disabled={busyId === sub.id} onClick={() => review(sub.id, 'reject')}>
                    ✕ Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : progress.length === 0 ? (
        <p className={styles.empty}>Пока никто не начинал курсы.</p>
      ) : (
        <div className={styles.list}>
          {progress.map(p => (
            <div key={`${p.userId}:${p.courseId}`} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpandedId(expandedId === p.userId + p.courseId ? null : p.userId + p.courseId)}>
                <div>
                  <p className={styles.userEmail}>{p.userEmail}</p>
                  <p className={styles.courseTitle}>
                    {p.courseTitle} · {p.completedCount}/{p.totalLessons} уроков
                    {p.submissionStatus === 'pending' && ' · ⏳ отправлено на проверку'}
                    {p.submissionStatus === 'rejected' && ' · ✕ отклонено'}
                    {' · '}последняя активность {fmtDate(p.lastActivity)}
                  </p>
                </div>
                <span className={styles.expandIcon}>{expandedId === p.userId + p.courseId ? '−' : '+'}</span>
              </div>

              {expandedId === p.userId + p.courseId && (
                <div className={styles.lessonsList}>
                  {p.lessons.map((l, i) => (
                    <div key={i} className={styles.lessonBlock}>
                      <p className={styles.lessonTitle}>{i + 1}. {l.title}</p>
                      <ProofView lesson={l} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
