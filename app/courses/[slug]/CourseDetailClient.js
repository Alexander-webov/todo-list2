'use client';
import { useState, useEffect } from 'react';
import styles from './course.module.css';

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderContent(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} className={styles.lessonH3}>{renderInline(line.slice(3))}</h3>;
    if (line.startsWith('- ')) return <li key={i} className={styles.lessonLi}>{renderInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className={styles.lessonLi}>{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
    if (!line.trim()) return null;
    return <p key={i} className={styles.lessonP}>{renderInline(line)}</p>;
  });
}

function TaskInput({ lesson, savedProof, onSubmit, submitting, alreadyDone }) {
  const [text, setText] = useState(savedProof?.text || '');
  const [clicked, setClicked] = useState(savedProof?.clicked || []);

  if (lesson.task_type === 'text_input') {
    const minLength = lesson.task_config?.minLength || 10;
    const valid = text.trim().length >= minLength;
    return (
      <>
        <textarea
          className={styles.taskTextarea}
          placeholder={lesson.task_config?.placeholder || ''}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          disabled={alreadyDone}
        />
        <p className={styles.taskHint}>{text.trim().length}/{minLength} символов минимум</p>
        <button
          className={styles.doneBtn}
          disabled={submitting || alreadyDone || !valid}
          onClick={() => onSubmit({ text })}
        >
          {alreadyDone ? '✓ Урок пройден' : submitting ? '...' : 'Отправить и отметить пройденным'}
        </button>
      </>
    );
  }

  if (lesson.task_type === 'exchange_links') {
    const links = lesson.task_config?.links || [];
    const minRequired = lesson.task_config?.minRequired || 3;
    const validCount = clicked.length;

    function handleLinkClick(name, url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setClicked(prev => prev.includes(name) ? prev : [...prev, name]);
    }

    return (
      <>
        <div className={styles.exchangeGrid}>
          {links.map(l => (
            <button
              key={l.name}
              className={`${styles.exchangeBtn} ${clicked.includes(l.name) ? styles.exchangeBtnDone : ''}`}
              onClick={() => handleLinkClick(l.name, l.url)}
              disabled={alreadyDone}
            >
              {clicked.includes(l.name) ? '✓ ' : ''}{l.name}{l.favorite ? ' ⭐' : ''}
            </button>
          ))}
        </div>
        <p className={styles.taskHint}>Пройдено бирж: {validCount}/{minRequired} минимум</p>
        <button
          className={styles.doneBtn}
          disabled={submitting || alreadyDone || validCount < minRequired}
          onClick={() => onSubmit({ clicked })}
        >
          {alreadyDone ? '✓ Урок пройден' : submitting ? '...' : 'Отметить пройденным'}
        </button>
      </>
    );
  }

  if (lesson.task_type === 'project_click_check') {
    return (
      <button
        className={styles.doneBtn}
        disabled={submitting || alreadyDone}
        onClick={() => onSubmit({})}
      >
        {alreadyDone ? '✓ Урок пройден' : submitting ? 'Проверяю…' : 'Проверить и отметить пройденным'}
      </button>
    );
  }

  // self_report
  return (
    <button
      className={styles.doneBtn}
      disabled={submitting || alreadyDone}
      onClick={() => onSubmit({})}
    >
      {alreadyDone ? '✓ Урок пройден' : submitting ? '...' : 'Отметить пройденным'}
    </button>
  );
}

export function CourseDetailClient({ slug }) {
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [proofByLesson, setProofByLesson] = useState({});
  const [submission, setSubmission] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetch(`/api/courses/${slug}`)
      .then(r => r.json())
      .then(d => {
        setCourse(d.course);
        setLessons(d.lessons || []);
        setCompletedIds(d.completedIds || []);
        setProofByLesson(d.proofByLesson || {});
        setSubmission(d.submission || null);
        setIsLoggedIn(!!d.isLoggedIn);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [slug]);

  const active = lessons[activeIdx];
  const isActiveDone = active && completedIds.includes(active.id);
  const allLessonsDone = lessons.length > 0 && lessons.every(l => completedIds.includes(l.id));

  async function markDone(proof) {
    if (!isLoggedIn) {
      window.location.href = `/register?redirect=/courses/${slug}`;
      return;
    }
    setMarking(true);
    setTaskError('');
    try {
      const res = await fetch('/api/courses/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: active.id, proof }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskError(data.error || 'Не удалось засчитать задание');
        return;
      }
      setCompletedIds(prev => [...prev, active.id]);
      setProofByLesson(prev => ({ ...prev, [active.id]: proof }));
      if (activeIdx < lessons.length - 1) setActiveIdx(activeIdx + 1);
    } finally {
      setMarking(false);
    }
  }

  async function submitForReview() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (res.ok) load(); // подтянет актуальный submission-статус
      else setTaskError(data.error || 'Не удалось отправить на проверку');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className={styles.page}><div className={styles.empty}>Загрузка…</div></div>;
  if (!course) return null;

  return (
    <div className={styles.page}>
      <a href="/courses" className={styles.back}>← Все курсы</a>

      <div className={styles.hero}>
        <span className={styles.emoji}>{course.emoji}</span>
        <h1 className={styles.title}>{course.title}</h1>
        <p className={styles.sub}>{course.description}</p>
      </div>

      {submission?.status === 'approved' && (
        <div className={styles.rewardBanner}>
          🎉 Курс пройден! На баланс зачислено <strong>{course.reward_amount} ₽</strong> — потратить можно на премиум, AI-отклики или резюме.
        </div>
      )}
      {submission?.status === 'pending' && (
        <div className={styles.pendingBanner}>
          ⏳ Курс отправлен на проверку. Обычно это занимает немного времени — баланс зачислится после одобрения.
        </div>
      )}
      {submission?.status === 'rejected' && (
        <div className={styles.rejectedBanner}>
          Курс не прошёл проверку{submission.admin_note ? `: ${submission.admin_note}` : '.'} Можешь пройти уроки заново и отправить снова.
        </div>
      )}

      <div className={styles.lessonNav}>
        {lessons.map((l, i) => (
          <button
            key={l.id}
            className={`${styles.lessonNavItem} ${i === activeIdx ? styles.lessonNavItemActive : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            <span className={styles.lessonNavCheck}>{completedIds.includes(l.id) ? '✓' : i + 1}</span>
            {l.title}
          </button>
        ))}
      </div>

      {active && (
        <div className={styles.lessonCard}>
          <h2 className={styles.lessonTitle}>{active.title}</h2>
          <div className={styles.lessonContent}>{renderContent(active.content)}</div>

          {active.task && (
            <div className={styles.taskBox}>
              <p className={styles.taskLabel}>📝 Задание</p>
              <p className={styles.taskText}>{active.task}</p>
            </div>
          )}

          <TaskInput
            lesson={active}
            savedProof={proofByLesson[active.id]}
            onSubmit={markDone}
            submitting={marking}
            alreadyDone={isActiveDone}
          />
          {taskError && <p className={styles.taskError}>{taskError}</p>}
        </div>
      )}

      {allLessonsDone && !submission && (
        <button className={styles.submitReviewBtn} onClick={submitForReview} disabled={submitting}>
          {submitting ? 'Отправляю…' : 'Все уроки пройдены — отправить на проверку'}
        </button>
      )}
    </div>
  );
}
