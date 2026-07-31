'use client';
import { useState } from 'react';
import styles from '../resume-builder.module.css';

function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {value.map(tag => (
          <span key={tag} style={{ fontSize: 12, background: 'var(--border)', borderRadius: 999, padding: '3px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className={styles.input}
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button onClick={add} className={styles.aiBtn} type="button">+</button>
      </div>
    </div>
  );
}

const emptyExperience = { position: '', company: '', period: '', description: '' };
const emptyEducation = { school: '', degree: '', period: '' };

export function ResumeEditorClient({ resume }) {
  const [country, setCountry] = useState(resume.country || 'ru');
  const [data, setData] = useState({
    fullName: '', email: '', phone: '', location: '', birthDate: '',
    targetRole: '', summary: '',
    experience: [], education: [], skills: [], languages: [],
    links: { portfolio: '', linkedin: '', github: '' },
    ...resume.data,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState('');

  const isIntl = country === 'intl';

  function set(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
  }

  function updateExperience(i, field, value) {
    setData(prev => {
      const next = [...prev.experience];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, experience: next };
    });
  }
  function addExperience() {
    setData(prev => ({ ...prev, experience: [...prev.experience, { ...emptyExperience }] }));
  }
  function removeExperience(i) {
    setData(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }));
  }

  function updateEducation(i, field, value) {
    setData(prev => {
      const next = [...prev.education];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, education: next };
    });
  }
  function addEducation() {
    setData(prev => ({ ...prev, education: [...prev.education, { ...emptyEducation }] }));
  }
  function removeEducation(i) {
    setData(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }));
  }

  async function askAi(section, payload, applyFn) {
    const key = `${section}-${payload.index ?? ''}`;
    setAiLoading(key);
    try {
      const res = await fetch('/api/resumes/ai-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, country, targetRole: data.targetRole, ...payload }),
      });
      const result = await res.json();
      if (res.ok && result.text) applyFn(result.text);
      else alert(result.error || 'AI-советчик недоступен, попробуй ещё раз');
    } catch {
      alert('Ошибка соединения');
    } finally {
      setAiLoading('');
    }
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/resumes/${resume.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, data }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <a href="/resume-builder" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Все резюме</a>

      <div className={styles.countryToggle} style={{ marginTop: 16 }}>
        <button className={`${styles.countryTab} ${!isIntl ? styles.countryTabActive : ''}`} onClick={() => setCountry('ru')}>🇷🇺 Россия</button>
        <button className={`${styles.countryTab} ${isIntl ? styles.countryTabActive : ''}`} onClick={() => setCountry('intl')}>🌍 США / Европа</button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Личные данные</div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Полное имя</label>
            <input className={styles.input} value={data.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Иван Иванов" />
          </div>
          <div className={styles.field}>
            <label>Целевая должность</label>
            <input className={styles.input} value={data.targetRole} onChange={e => set('targetRole', e.target.value)} placeholder="Frontend-разработчик" />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Email</label>
            <input className={styles.input} value={data.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Телефон</label>
            <input className={styles.input} value={data.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Город</label>
            <input className={styles.input} value={data.location} onChange={e => set('location', e.target.value)} />
          </div>
        </div>
        {!isIntl && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Дата рождения (необязательно)</label>
              <input className={styles.input} value={data.birthDate} onChange={e => set('birthDate', e.target.value)} placeholder="01.01.1995" />
            </div>
          </div>
        )}
        {isIntl && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            В резюме для США/Европы не указывают возраст, семейное положение и фото — там это норма против дискриминации при найме.
          </p>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>О себе</div>
        <textarea className={styles.textarea} rows={4} value={data.summary} onChange={e => set('summary', e.target.value)}
          placeholder={isIntl ? 'Professional summary — 2-3 sentences on your value' : 'Кратко: кто ты и чем ценен для работодателя'} />
        <button
          className={styles.aiBtn}
          disabled={aiLoading === 'summary-'}
          onClick={() => askAi('summary', { text: data.summary }, (text) => set('summary', text))}
        >
          {aiLoading === 'summary-' ? 'Думаю…' : '✨ Улучшить с AI'}
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Опыт работы</div>
        {data.experience.map((exp, i) => (
          <div key={i} className={styles.entryCard}>
            <button className={styles.removeEntry} onClick={() => removeExperience(i)} type="button">✕</button>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Должность</label>
                <input className={styles.input} value={exp.position} onChange={e => updateExperience(i, 'position', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Компания</label>
                <input className={styles.input} value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Период</label>
                <input className={styles.input} value={exp.period} onChange={e => updateExperience(i, 'period', e.target.value)} placeholder="2022 — н.в." />
              </div>
            </div>
            <div className={styles.field}>
              <label>Описание и достижения</label>
              <textarea className={styles.textarea} rows={3} value={exp.description} onChange={e => updateExperience(i, 'description', e.target.value)} />
            </div>
            <button
              className={styles.aiBtn}
              disabled={aiLoading === `experience-${i}`}
              onClick={() => askAi('experience', { index: i, position: exp.position, text: exp.description }, (text) => updateExperience(i, 'description', text))}
            >
              {aiLoading === `experience-${i}` ? 'Думаю…' : '✨ Улучшить с AI'}
            </button>
          </div>
        ))}
        <button className={styles.addEntryBtn} onClick={addExperience} type="button">+ Добавить место работы</button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Образование</div>
        {data.education.map((ed, i) => (
          <div key={i} className={styles.entryCard}>
            <button className={styles.removeEntry} onClick={() => removeEducation(i)} type="button">✕</button>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Учебное заведение</label>
                <input className={styles.input} value={ed.school} onChange={e => updateEducation(i, 'school', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Специальность</label>
                <input className={styles.input} value={ed.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Период</label>
                <input className={styles.input} value={ed.period} onChange={e => updateEducation(i, 'period', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <button className={styles.addEntryBtn} onClick={addEducation} type="button">+ Добавить образование</button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Навыки</div>
        <TagInput value={data.skills} onChange={(v) => set('skills', v)} placeholder="React, Figma, Python..." />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Языки</div>
        <TagInput value={data.languages} onChange={(v) => set('languages', v)} placeholder="Английский — B2..." />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Ссылки</div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Портфолио</label>
            <input className={styles.input} value={data.links?.portfolio || ''} onChange={e => set('links', { ...data.links, portfolio: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>LinkedIn</label>
            <input className={styles.input} value={data.links?.linkedin || ''} onChange={e => set('links', { ...data.links, linkedin: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>GitHub</label>
            <input className={styles.input} value={data.links?.github || ''} onChange={e => set('links', { ...data.links, github: e.target.value })} />
          </div>
        </div>
      </div>

      <div className={styles.saveBar}>
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Сохраняю…' : saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
        <a href={`/resume-builder/${resume.id}/print`} target="_blank" rel="noopener noreferrer" className={styles.printBtn}>
          Печать / PDF
        </a>
      </div>
    </div>
  );
}
