'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProjectCard.module.css';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { calcMatch, getMatchLabel } from '@/lib/match';
import { trackApplication } from './ApplicationMotivator';
import { GoToProjectButton } from './GoToProjectButton';

const SOURCE_META = {
  fl: { name: 'FL.ru', color: '#ff6600', flag: '🇷🇺' },
  kwork: { name: 'Kwork', color: '#ff4d00', flag: '🇷🇺' },
  freelanceru: { name: 'Freelance.ru', color: '#2ecc71', flag: '🇷🇺' },
  youdo: { name: 'Youdo', color: '#f5a623', flag: '🇷🇺' },
  freelancer: { name: 'Freelance.com', color: '#29b2fe', flag: '🌐' },
  peopleperhour: { name: 'PeoplePerHour', color: '#f7931a', flag: '🌐' },
  guru: { name: 'Guru.com', color: '#5b3cc4', flag: '🌐' },
};

function formatBudget(min, max, currency) {
  if (!min && !max) return null;
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)} 000` : n;
  if (min && max) return `${fmt(min)}${sym} — ${fmt(max)}${sym}`;
  if (min) return `от ${fmt(min)}${sym}`;
  if (max) return `до ${fmt(max)}${sym}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ru }); }
  catch { return ''; }
}

function isFreshProject(dateStr) {
  if (!dateStr) return false;
  try {
    const diffMin = (Date.now() - new Date(dateStr).getTime()) / 60000;
    return diffMin < 5;
  } catch { return false; }
}

export function ProjectCard({ project, profile, style }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const meta = SOURCE_META[project.source] || { name: project.source, color: '#6b7a99', flag: '🌐' };
  const budget = formatBudget(project.budget_min, project.budget_max, project.currency);
  const url = project.referral_url || project.url;

  const matchPct = profile ? calcMatch(project, profile) : null;
  const matchInfo = matchPct !== null ? getMatchLabel(matchPct) : null;

  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );

  const dateForFresh = project.published_at || project.created_at;
  const fresh = isFreshProject(dateForFresh);

  async function generateResponse() {
    const now = Date.now();

    if (cooldownUntil > now) {
      const seconds = Math.ceil((cooldownUntil - now) / 1000);
      setModal(true);
      setResponse(`Лимит AI. Попробуй ещё раз через ${seconds} секунд. Можно откликнуться вручную кнопкой ниже.`);
      return;
    }

    setModal(true);
    setSendDone(false);
    if (response && !response.startsWith('Лимит AI') && !response.startsWith('AI сервис')) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: project.title, description: project.description, source: project.source, budget }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 402 || data.premium_required) {
        setModal(false);
        setLoading(false);
        window.location.href = '/pricing?from=ai';
        return;
      }

      if (res.status === 429 || data.code === 'AI_RATE_LIMIT') {
        const retryAfter = Math.min(Number(data.retryAfter || res.headers.get('retry-after') || 20), 90);
        setCooldownUntil(Date.now() + retryAfter * 1000);
        setResponse(data.error || `Лимит AI. Попробуй ещё раз через ${retryAfter} секунд. Можно откликнуться вручную кнопкой ниже.`);
        return;
      }

      if (!res.ok) {
        setResponse(data.error || 'AI сервис временно недоступен. Можно откликнуться на проект вручную.');
        return;
      }

      setResponse(data.text || 'AI вернул пустой ответ. Попробуй ещё раз.');
      setCooldownUntil(Date.now() + 4000);
    } catch {
      setResponse('Ошибка соединения с AI. Можно откликнуться на проект вручную.');
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendResponse() {
    setSending(true);
    try { await navigator.clipboard.writeText(response); } catch (_) { }
    trackApplication(project.id, true);
    setSendDone(true);
    setSending(false);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      setModal(false);
      router.push(`/projects/${project.id}/responded`);
    }, 400);
  }

  function closeModal(e) {
    if (e.target === e.currentTarget) setModal(false);
  }

  function handleAiClick(e) {
    if (!isPremium) return; // ссылка на /pricing сработает сама
    e.preventDefault();
    generateResponse();
  }

  return (
    <>
      <article
        className={`${styles.card} ${fresh ? styles.cardFresh : ''} animate-in`}
        style={style}
      >
        {/* ── Row 1: source badge (left) + time (right) ── */}
        <div className={styles.rowTop}>
          <span className={styles.sourceBadge} style={{ '--source-color': meta.color }}>
            <span className={styles.sourceFlag}>{meta.flag}</span>
            <span>{meta.name}</span>
          </span>
          <div className={styles.tags}>
            {project.tags?.slice(0, 5).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
            {project.category && !project.tags?.length && (
              <span className={styles.tag}>#{project.category}</span>
            )}
          </div>

          <div className={styles.topRight}>
            {matchInfo && (
              <span
                className={styles.matchBadge}
                style={{ color: matchInfo.color, background: `${matchInfo.color}18`, border: `1px solid ${matchInfo.color}40` }}
              >
                🎯 {matchInfo.label}
              </span>
            )}
            {fresh ? (
              <span className={styles.freshBadge}>
                <span className={styles.freshIcon}>⚡</span>
                <span>Только что</span>
              </span>
            ) : (
              <span className={styles.time}>
                <span className={styles.timeIcon}>🕒</span>
                {timeAgo(dateForFresh)}
              </span>
            )}
          </div>
        </div>

        {/* ── Row 2: title (left) + budget (right) ── */}
        <div className={styles.rowTitle}>
          <a href={`/projects/${project.id}`} className={styles.titleLink}>
            <h2 className={styles.title}>{project.title}</h2>
          </a>

        </div>

        {/* ── Row 3: description ── */}
        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}

        {/* ── Row 4: tags (left) + AI button (right) ── */}
        <div className={styles.rowFooter}>

          {budget ? (
            <span className={styles.budget}>{budget}</span>
          ) : (
            <span className={styles.budgetEmpty}>Не указан</span>
          )}

          <div className={styles.actions}>


            {isPremium ? (
              <div className="">
                <button className={styles.aiBtn} onClick={handleAiClick}>
                  <span className={styles.aiIcon}>✦</span>
                  <span>AI-отклик</span>
                </button>
                <GoToProjectButton
                  projectId={project.id}
                  url={url}
                  source={meta.name}
                  className={styles.manualBtn}
                >
                  Перейти →
                </GoToProjectButton>
              </div>

            ) : (
              <div className="">
                <a
                  className={styles.aiBtn}
                  href="/pricing?from=ai"
                  title="AI-отклики доступны в премиум-подписке"
                >
                  <span className={styles.aiIcon}>🔒</span>
                  <span>AI-отклик</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </article>

      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span className={styles.modalAiIcon}>✦</span>
                <span>AI Отклик</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div className={styles.modalProject}>
              <span className={styles.sourceBadge} style={{ '--source-color': meta.color }}>
                {meta.flag} {meta.name}
              </span>
              <p className={styles.modalProjectTitle}>{project.title}</p>
            </div>
            <div className={styles.modalBody}>
              {loading ? (
                <div className={styles.generating}>
                  <div className={styles.genDots}>
                    {[0, 1, 2].map(i => <span key={i} className={styles.genDot} style={{ animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                  <p>Генерирую отклик...</p>
                </div>
              ) : (
                <textarea className={styles.responseText} value={response} onChange={e => setResponse(e.target.value)} rows={10} />
              )}
            </div>
            {!loading && response && (
              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button className={styles.copyBtn} onClick={copyText}>
                    {copied ? '✓ Скопировано' : '⎘ Копировать'}
                  </button>
                  <GoToProjectButton
                    projectId={project.id}
                    url={url}
                    source={meta.name}
                    className={styles.manualModalBtn}
                  >
                    Открыть проект →
                  </GoToProjectButton>
                  <button
                    className={`${styles.sendBtn} ${sendDone ? styles.sendBtnDone : ''}`}
                    onClick={sendResponse}
                    disabled={sending || sendDone}
                  >
                    {sendDone ? '✓ Скопировано! Открываю...' : sending ? '...' : `Скопировать и открыть ${meta.name} →`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
