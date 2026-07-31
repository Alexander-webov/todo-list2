'use client';
import { useState } from 'react';
import styles from './PremiumQuiz.module.css';
import { getPrice } from '@/lib/pricing';

// «Тест»: 4 коротких вопроса → иллюстративный расчёт упущенной выгоды за месяц
// без премиума → CTA на оплату. Это не персональная финансовая аналитика,
// а наглядная оценка по средним цифрам ниши (это честно проговаривается
// в сноске под результатом) — механика того же типа, что калькуляторы
// экономии у страховых или банков.

const QUESTIONS = [
  {
    key: 'niche',
    title: 'В какой нише ты берёшь заказы?',
    options: [
      { label: '🎨 Дизайн', value: 'design' },
      { label: '💻 Разработка', value: 'dev' },
      { label: '📱 SMM', value: 'smm' },
      { label: '🎬 Видео', value: 'video' },
      { label: '📌 Другое', value: 'other' },
    ],
  },
  {
    key: 'orderValue',
    title: 'Сколько в среднем платят за заказ в твоей нише?',
    options: [
      { label: 'До 5 000 ₽', value: 3000 },
      { label: '5 000 – 15 000 ₽', value: 10000 },
      { label: '15 000 – 40 000 ₽', value: 27000 },
      { label: '40 000 ₽ и выше', value: 55000 },
    ],
  },
  {
    key: 'howOften',
    title: 'Как часто хороший заказ «разбирали», пока ты его искал вручную?',
    options: [
      { label: 'Такого не было', value: 0 },
      { label: 'Иногда', value: 1 },
      { label: 'Часто', value: 3 },
      { label: 'Почти каждую неделю', value: 5 },
    ],
  },
  {
    key: 'searchTime',
    title: 'Сколько времени в день уходит на ручной поиск по биржам?',
    options: [
      { label: 'Меньше 15 минут', value: 0.25 },
      { label: '15–30 минут', value: 0.5 },
      { label: '30–60 минут', value: 1 },
      { label: 'Больше часа', value: 1.5 },
    ],
  },
];

export function PremiumQuiz() {
  const [step, setStep] = useState(0); // -1 = ещё не начат, 0..3 = вопросы, 4 = результат
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState({});

  const RU = getPrice('ru');

  function answer(key, value) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setStep((s) => s + 1);
  }

  function reset() {
    setStarted(false);
    setStep(0);
    setAnswers({});
  }

  if (!started) {
    return (
      <div className={styles.card}>
        <span className={styles.badge}>⚡ 30 секунд</span>
        <h2 className={styles.introTitle}>Сколько ты теряешь без премиума?</h2>
        <p className={styles.introText}>
          4 коротких вопроса — покажем примерную сумму, которую ты мог(ла) не дозаработать
          за месяц ручного поиска заказов.
        </p>
        <button className={styles.startBtn} onClick={() => setStarted(true)}>
          Пройти тест →
        </button>
      </div>
    );
  }

  if (step < QUESTIONS.length) {
    const q = QUESTIONS[step];
    return (
      <div className={styles.card}>
        <div className={styles.progress}>
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ''}`} />
          ))}
        </div>
        <h3 className={styles.qTitle}>{q.title}</h3>
        <div className={styles.options}>
          {q.options.map((opt) => (
            <button
              key={opt.label}
              className={styles.optionBtn}
              onClick={() => answer(q.key, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Результат
  const missedPerMonth = (answers.howOften || 0) * 4; // «часто/иногда» в неделю → в месяц
  const orderValue = answers.orderValue || 10000;
  const lostMoney = Math.round((missedPerMonth * orderValue) / 1000) * 1000;
  const hoursWasted = Math.round((answers.searchTime || 0.5) * 30);
  const roi = lostMoney > 0 ? Math.round(lostMoney / RU.final) : 0;

  return (
    <div className={styles.card}>
      <span className={styles.badge}>Результат</span>
      {lostMoney > 0 ? (
        <>
          <h2 className={styles.resultTitle}>
            До ~{lostMoney.toLocaleString('ru')} ₽/мес ты мог(ла) недополучить
          </h2>
          <p className={styles.resultText}>
            Из-за заказов, которые «разобрали» пока ты искал(а) их вручную, плюс
            ~{hoursWasted} часов в месяц на сам поиск, который лента делает за тебя автоматически.
          </p>
          <div className={styles.roiBox}>
            <span className={styles.roiNum}>×{Math.max(roi, 1)}</span>
            <span className={styles.roiText}>
              Премиум за {RU.final} ₽ дешевле одного упущенного заказа минимум в {Math.max(roi, 1)} раз(а)
            </span>
          </div>
        </>
      ) : (
        <>
          <h2 className={styles.resultTitle}>Пока ты неплохо справляешься вручную</h2>
          <p className={styles.resultText}>
            Но {hoursWasted > 0 ? `~${hoursWasted} часов в месяц` : 'время'} на ручной поиск
            премиум забирает на себя — плюс уведомления в Telegram, чтобы
            не проверять биржи самому.
          </p>
        </>
      )}
      <a href="/pricing#plans" className={styles.ctaBtn} onClick={(e) => {
        // Если тест уже открыт внутри страницы pricing — просто скроллим к тарифам.
        const plans = document.getElementById('plans');
        if (plans) { e.preventDefault(); plans.scrollIntoView({ behavior: 'smooth' }); }
      }}>
        Открыть премиум за {RU.final} ₽ →
      </a>
      <button className={styles.retryBtn} onClick={reset}>Пройти ещё раз</button>
      <p className={styles.disclaimer}>
        Это иллюстративный расчёт по средним цифрам ниши, не персональная гарантия дохода.
      </p>
    </div>
  );
}
