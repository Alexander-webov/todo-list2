'use client';
import styles from './print.module.css';

export function PrintClient({ resume }) {
  const d = resume.data || {};
  const isIntl = resume.country === 'intl';

  return (
    <div className={styles.wrap}>
      <button className={styles.printBtn} onClick={() => window.print()}>🖨 Печать / Сохранить как PDF</button>

      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.name}>{d.fullName || 'Без имени'}</h1>
          <div className={styles.role}>{d.targetRole}</div>
          <div className={styles.contacts}>
            {[d.email, d.phone, d.location].filter(Boolean).join(' · ')}
            {!isIntl && d.birthDate && ` · ${d.birthDate}`}
          </div>
          {(d.links?.portfolio || d.links?.linkedin || d.links?.github) && (
            <div className={styles.links}>
              {[d.links?.portfolio, d.links?.linkedin, d.links?.github].filter(Boolean).join(' · ')}
            </div>
          )}
        </header>

        {d.summary && (
          <section className={styles.section}>
            <h2>{isIntl ? 'Summary' : 'О себе'}</h2>
            <p>{d.summary}</p>
          </section>
        )}

        {d.experience?.length > 0 && (
          <section className={styles.section}>
            <h2>{isIntl ? 'Experience' : 'Опыт работы'}</h2>
            {d.experience.map((exp, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryTop}>
                  <span className={styles.entryTitle}>{exp.position}{exp.company ? ` — ${exp.company}` : ''}</span>
                  <span className={styles.entryPeriod}>{exp.period}</span>
                </div>
                {exp.description && <p className={styles.entryDesc}>{exp.description}</p>}
              </div>
            ))}
          </section>
        )}

        {d.education?.length > 0 && (
          <section className={styles.section}>
            <h2>{isIntl ? 'Education' : 'Образование'}</h2>
            {d.education.map((ed, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryTop}>
                  <span className={styles.entryTitle}>{ed.school}{ed.degree ? ` — ${ed.degree}` : ''}</span>
                  <span className={styles.entryPeriod}>{ed.period}</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {d.skills?.length > 0 && (
          <section className={styles.section}>
            <h2>{isIntl ? 'Skills' : 'Навыки'}</h2>
            <p>{d.skills.join(' · ')}</p>
          </section>
        )}

        {d.languages?.length > 0 && (
          <section className={styles.section}>
            <h2>{isIntl ? 'Languages' : 'Языки'}</h2>
            <p>{d.languages.join(' · ')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
