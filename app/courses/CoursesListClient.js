'use client';
import { useState, useEffect } from 'react';
import styles from './courses.module.css';

export function CoursesListClient() {
  const [courses, setCourses] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(d => { setCourses(d.courses || []); setIsLoggedIn(!!d.isLoggedIn); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.badge}>🎓 Курсы</span>
        <h1 className={styles.title}>Учись и получай баланс на сайт</h1>
        <p className={styles.sub}>
          Практические курсы с заданиями — бесплатно. Пройди курс целиком — получи баланс,
          который можно потратить на премиум, AI-отклики или резюме. Обменять на реальные
          деньги нельзя — только на услуги сайта.
        </p>
        {!isLoggedIn && (
          <p className={styles.loginHint}>
            <a href="/register?redirect=/courses">Зарегистрируйся</a>, чтобы проходить уроки и получать баланс.
          </p>
        )}
      </div>

      {loading ? (
        <div className={styles.empty}>Загрузка…</div>
      ) : courses.length === 0 ? (
        <div className={styles.empty}>Курсы скоро появятся.</div>
      ) : (
        <div className={styles.list}>
          {courses.map(c => (
            <a key={c.id} href={`/courses/${c.slug}`} className={styles.card}>
              <span className={styles.cardEmoji}>{c.emoji}</span>
              <div className={styles.cardBody}>
                <p className={styles.cardTitle}>{c.title}</p>
                <p className={styles.cardDesc}>{c.description}</p>
                <div className={styles.cardMeta}>
                  <span>{c.totalLessons} уроков</span>
                  {isLoggedIn && c.submissionStatus === 'approved' && (
                    <span className={styles.cardProgress}>✓ Пройден</span>
                  )}
                  {isLoggedIn && c.submissionStatus === 'pending' && (
                    <span className={styles.cardProgress}>⏳ На проверке</span>
                  )}
                  {isLoggedIn && !c.submissionStatus && c.completedLessons > 0 && (
                    <span className={styles.cardProgress}>{c.completedLessons}/{c.totalLessons} пройдено</span>
                  )}
                  <span className={styles.cardReward}>+{c.reward_amount} ₽ на баланс</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
