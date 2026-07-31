'use client';
import { useState } from 'react';
import styles from './ai-response.module.css';

export function AIResponseClient({ isLoggedIn, freeUsed, credits: initialCredits }) {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [buyLoading, setBuyLoading] = useState('');

  const canFreeTry = !freeUsed;

  async function generate() {
    if (!isLoggedIn) {
      window.location.href = '/register?redirect=/ai-response';
      return;
    }
    if (!description.trim()) {
      setError('Вставь описание проекта или вакансии');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setNeedsCredits(false);

    try {
      const res = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 || data.credits_required) {
        setNeedsCredits(true);
        setError(data.error || 'Нужны кредиты для генерации');
        return;
      }
      if (res.status === 429) {
        setError(data.error || 'Подожди немного между генерациями');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'AI сервис временно недоступен');
        return;
      }

      setResult(data.text || 'AI вернул пустой ответ, попробуй ещё раз');
      if (data.creditsRemaining !== null && data.creditsRemaining !== undefined) {
        setCredits(data.creditsRemaining);
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function buyCredits(pack) {
    if (!isLoggedIn) {
      window.location.href = '/register?redirect=/ai-response';
      return;
    }
    setBuyLoading(pack);
    try {
      const res = await fetch('/api/payment/yookassa/create-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json();
      const redirectUrl = data.confirmation_url || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setError(data.error || 'Не удалось создать платёж');
        setBuyLoading('');
      }
    } catch {
      setError('Ошибка соединения');
      setBuyLoading('');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.badge}>✨ AI-генератор</span>
        <h1 className={styles.title}>Отклик на любой проект за 10 секунд</h1>
        <p className={styles.sub}>
          Вставь описание проекта или вакансии — получишь живой, персонализированный отклик,
          а не шаблон «Здравствуйте, готов выполнить».
        </p>

        <div className={styles.statusLine}>
          {isLoggedIn ? (
            canFreeTry
              ? '🎁 У тебя есть 1 бесплатная генерация'
              : `💳 Кредитов на балансе: ${credits}`
          ) : (
            '🎁 Первая генерация бесплатна после регистрации'
          )}
        </div>
        <p className={styles.priceInfo}>
          Дальше — 10 генераций за 99 ₽ или 100 за 499 ₽. Без подписки, разовая покупка.
        </p>
      </div>

      <div className={styles.card}>
        <textarea
          className={styles.textarea}
          placeholder="Вставь сюда текст вакансии или проекта целиком..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
        />

        <button className={styles.generateBtn} onClick={generate} disabled={loading}>
          {loading ? 'Генерирую…' : 'Сгенерировать отклик'}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        {result && (
          <div className={styles.result}>
            <div className={styles.resultHeader}>
              <span>Готовый отклик</span>
              <button className={styles.copyBtn} onClick={copyResult}>
                {copied ? '✓ Скопировано' : 'Скопировать'}
              </button>
            </div>
            <p className={styles.resultText}>{result}</p>
          </div>
        )}

        {needsCredits && (
          <div className={styles.buyBox}>
            <h3>Пополни баланс генераций</h3>
            <div className={styles.packs}>
              <button className={styles.packBtn} onClick={() => buyCredits('10')} disabled={!!buyLoading}>
                {buyLoading === '10' ? '...' : (
                  <>
                    <span className={styles.packAmount}>10 генераций</span>
                    <span className={styles.packPrice}>99 ₽</span>
                  </>
                )}
              </button>
              <button className={styles.packBtn} onClick={() => buyCredits('100')} disabled={!!buyLoading}>
                {buyLoading === '100' ? '...' : (
                  <>
                    <span className={styles.packAmount}>100 генераций</span>
                    <span className={styles.packPrice}>499 ₽</span>
                  </>
                )}
              </button>
            </div>
            <p className={styles.orPremium}>
              Оплачивая, вы соглашаетесь с <a href="/terms">условиями использования</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
