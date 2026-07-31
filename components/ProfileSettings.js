'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import styles from './ProfileSettings.module.css';
import { ROLES } from '@/lib/roles';

const CATEGORIES = [
  'WordPress / Tilda / CMS', 'Видеомонтаж', 'Графический дизайн',
  'Web дизайн', 'SMM', 'Парсинг', 'Вёрстка', 'FrontEnd', 'BackEnd',
];
const SOURCES = [
  { key: 'fl', label: '🇷🇺 FL.ru' },
  { key: 'kwork', label: '🇷🇺 Kwork' },
  { key: 'freelanceru', label: '🇷🇺 Freelance.ru' },
  { key: 'youdo', label: '🇷🇺 Youdo' },
  { key: 'freelancer', label: '🌐 Freelancer.com' },
  { key: 'peopleperhour', label: '🌐 PeoplePerHour' },
  { key: 'guru', label: '🌐 Guru.com' },
];

function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim().toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }

  function remove(tag) {
    onChange(value.filter(t => t !== tag));
  }

  return (
    <div className={styles.tagInput}>
      <div className={styles.tags}>
        {value.map(tag => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button onClick={() => remove(tag)} className={styles.tagRemove}>×</button>
          </span>
        ))}
      </div>
      <div className={styles.tagRow}>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button className={styles.tagAdd} onClick={add}>+</button>
      </div>
    </div>
  );
}

export function ProfileSettings({ profile, onSave }) {
  const [userRole, setUserRole] = useState(profile?.user_role || '');
  const [skills, setSkills] = useState(profile?.skills || []);
  const [keywords, setKeywords] = useState(profile?.keywords || []);
  const [excluded, setExcluded] = useState(profile?.excluded_keywords || []);
  const [minBudget, setMinBudget] = useState(profile?.min_budget || 0);
  const [categories, setCategories] = useState(profile?.filter_categories || []);
  const [sources, setSources] = useState(profile?.preferred_sources || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chatId, setChatId] = useState('');
  const [tgConnected, setTgConnected] = useState(!!profile?.telegram_chat_id);
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgError, setTgError] = useState('');

  function toggleCategory(cat) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function toggleSource(key) {
    setSources(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({
      user_role: userRole || null,
      skills,
      keywords,
      excluded_keywords: excluded,
      min_budget: minBudget,
      filter_categories: categories,
      preferred_sources: sources,
      // Те же данные под именами, которые читает Telegram-рассылка
      // (lib/telegram.js) — раньше писались только preferred_sources/keywords,
      // а рассылка читает filter_sources/filter_keywords, из-за чего
      // фильтрация по биржам и ключевым словам в уведомлениях никогда не работала.
      filter_sources: sources,
      filter_keywords: keywords,
    }).eq('id', user.id);

    // Сбрасываем dismissed чтобы новая роль применилась при следующем заходе
    try { sessionStorage.removeItem('role_dismissed'); } catch {}

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onSave) onSave({ user_role: userRole, skills, keywords, excluded_keywords: excluded, min_budget: minBudget, filter_categories: categories, preferred_sources: sources });
  }

  async function connectTelegram() {
    const id = chatId.trim();
    if (!id) { setTgError('Вставь Chat ID из бота'); return; }
    setTgConnecting(true);
    setTgError('');
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id }),
      });
      const data = await res.json();
      if (!res.ok) { setTgError(data.error || 'Не удалось подключить'); return; }
      setTgConnected(true);
    } catch {
      setTgError('Ошибка соединения');
    } finally {
      setTgConnecting(false);
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>⚡ Настройка совпадений</h2>
      <p className={styles.sub}>Заполни профиль — и рядом с каждым проектом появится % совпадения с тобой</p>

      <div className={styles.section}>
        <label className={styles.label}>Кто ты?</label>
        <p className={styles.hint}>Главное направление — по нему дефолтно фильтруем ленту</p>
        <div className={styles.chips}>
          {ROLES.map(r => (
            <button
              key={r.key}
              className={`${styles.chip} ${userRole === r.key ? styles.chipActive : ''}`}
              onClick={() => setUserRole(userRole === r.key ? '' : r.key)}
              type="button"
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Мои специализации</label>
        <p className={styles.hint}>Технологии и навыки которыми ты владеешь (react, figma, python...)</p>
        <TagInput value={skills} onChange={setSkills} placeholder="react, figma, python..." />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Категории проектов</label>
        <div className={styles.chips}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`${styles.chip} ${categories.includes(cat) ? styles.chipActive : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Ключевые слова в заказах</label>
        <p className={styles.hint}>Слова которые должны быть в описании (лендинг, telegram-бот...)</p>
        <TagInput value={keywords} onChange={setKeywords} placeholder="лендинг, telegram-бот..." />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Минимальный бюджет (₽)</label>
        <input
          type="number"
          className={styles.input}
          value={minBudget}
          onChange={e => setMinBudget(Number(e.target.value))}
          placeholder="0"
          min="0"
        />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Предпочитаемые биржи</label>
        <div className={styles.chips}>
          {SOURCES.map(s => (
            <button
              key={s.key}
              className={`${styles.chip} ${sources.includes(s.key) ? styles.chipActive : ''}`}
              onClick={() => toggleSource(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Стоп-слова</label>
        <p className={styles.hint}>Проекты с этими словами получат 0% совпадения</p>
        <TagInput value={excluded} onChange={setExcluded} placeholder="звонки, колл-центр..." />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>🔔 Уведомления в Telegram</label>
        {tgConnected ? (
          <p className={styles.hint} style={{ color: 'var(--green)' }}>
            ✓ Telegram подключён — новые проекты по твоим фильтрам выше будут приходить в личные сообщения
          </p>
        ) : (
          <>
            <p className={styles.hint}>
              1. Открой бота <a href="https://t.me/allfreelancershere_bot" target="_blank" rel="noopener noreferrer">@allfreelancershere_bot</a> и нажми Start<br />
              2. Бот пришлёт тебе Chat ID — скопируй и вставь сюда
            </p>
            <div className={styles.tagRow}>
              <input
                className={styles.input}
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="Например: 123456789"
              />
              <button className={styles.tagAdd} onClick={connectTelegram} disabled={tgConnecting} style={{ width: 'auto', padding: '0 16px' }}>
                {tgConnecting ? '...' : 'Подключить'}
              </button>
            </div>
            {tgError && <p className={styles.hint} style={{ color: '#ef4444' }}>{tgError}</p>}
          </>
        )}
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Сохраняю...' : saved ? '✓ Сохранено!' : 'Сохранить настройки'}
      </button>
    </div>
  );
}
