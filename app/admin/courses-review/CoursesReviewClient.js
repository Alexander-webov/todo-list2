'use client';
import { useState, useEffect } from 'react';
import styles from './review.module.css';

function ProofView({ lesson }) {
  if (lesson.taskType === 'text_input') {
    return <p className={styles.proofText}>{lesson.proof?.text || <em>— не заполнено —</em>}</p>;
  }
  if (lesson.taskType === 'exchange_links') {
    const clicked = lesson.proof?.clicked || [];
    return <p className={styles.proofText}>Перешёл на: {clicked.length ? clicked.join(', ') : <em>ничего</em>}</p>;
  }
  if (lesson.taskType === 'project_click_check') {
    return <p className={styles.proofText}>✓ Подтверждено автоматически (был переход на проект через сайт)</p>;
  }
  return <p className={styles.proofText}>✓ Отмечено пользователем (без проверяемых данных)</p>;
}

export function CoursesReviewClient() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  function load() {
    setLoading(true);
    fetch('/api/admin/courses/pending')
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions || []))
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
        <h1 className={styles.title}>Проверка курсов</h1>
      </div>

      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : submissions.length === 0 ? (
        <p className={styles.empty}>Заявок на проверку нет.</p>
      ) : (
        <div className={styles.list}>
          {submissions.map(sub => (
            <div key={sub.id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                <div>
                  <p className={styles.userEmail}>{sub.userEmail}</p>
                  <p className={styles.courseTitle}>{sub.courseTitle} · +{sub.rewardAmount} ₽</p>
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
                <button
                  className={styles.approveBtn}
                  disabled={busyId === sub.id}
                  onClick={() => review(sub.id, 'approve')}
                >
                  ✓ Одобрить
                </button>
                <button
                  className={styles.rejectBtn}
                  disabled={busyId === sub.id}
                  onClick={() => review(sub.id, 'reject')}
                >
                  ✕ Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
