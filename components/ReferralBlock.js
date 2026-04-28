'use client';
import { useState, useEffect } from 'react';
import styles from './ReferralBlock.module.css';

export function ReferralBlock() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [applyResult, setApplyResult] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(setData);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function applyCode(e) {
    e.preventDefault();
    setApplyLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: refCode }),
      });
      const result = await res.json();
      setApplyResult(result.success
        ? { ok: true, msg: result.message }
        : { ok: false, msg: result.error });
      if (result.success) setTimeout(() => window.location.reload(), 1500);
    } catch {
      setApplyResult({ ok: false, msg: 'Ошибка соединения' });
    } finally {
      setApplyLoading(false);
    }
  }

  if (!data) return null;

  return (
    <div className={styles.block}>
      <h2 className={styles.title}>🎁 Реферальная программа</h2>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statNum}>{data.totalReferred}</p>
          <p className={styles.statLabel}>Приглашено друзей</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statNum}>{data.daysEarned}</p>
          <p className={styles.statLabel}>Дней заработано</p>
        </div>
      </div>

      <p className={styles.desc}>
        За каждого приглашённого друга вы оба получаете бонус — помоги друзьям найти заказы быстрее!
      </p>

      <div className={styles.linkBox}>
        <span className={styles.link}>{data.referralLink}</span>
        <button className={styles.copyBtn} onClick={copyLink}>
          {copied ? '✓' : '⎘'}
        </button>
      </div>

      {/* Применить чужой код */}
      <form className={styles.applyForm} onSubmit={applyCode}>
        <input
          type="text" placeholder="Введи реферальный код друга"
          className={styles.input} value={refCode}
          onChange={e => setRefCode(e.target.value)} required
        />
        <button type="submit" className={styles.applyBtn} disabled={applyLoading}>
          {applyLoading ? '...' : 'Применить'}
        </button>
      </form>

      {applyResult && (
        <p className={`${styles.result} ${applyResult.ok ? styles.ok : styles.err}`}>
          {applyResult.msg}
        </p>
      )}
    </div>
  );
}
