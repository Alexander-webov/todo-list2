import styles from './StatsBar.module.css';

const RU_SOURCES = {
  fl: { name: 'FL.ru', color: '#ff6600' },
  kwork: { name: 'Kwork', color: '#ff4d00' },
  freelanceru: { name: 'Freelance.ru', color: '#2ecc71' },
  youdo: { name: 'Youdo', color: '#f5a623' },
};

const INT_SOURCES = {
  /*   upwork:        { name: 'Upwork',         color: '#14a800' }, */
  freelancer: { name: 'Freelancer', color: '#29b2fe' },
  peopleperhour: { name: 'PPH', color: '#f7931a' },
  guru: { name: 'Guru', color: '#5b3cc4' },
};

function SourceList({ sources, stats }) {
  return Object.entries(sources).map(([key, { name, color }]) => (
    <div key={key} className={styles.sourceItem}>
      <span className={styles.dot} style={{ background: color }} />
      <span className={styles.sourceName}>{name}</span>
      <span className={styles.sourceCount}>{(stats[key] || 0).toLocaleString('ru')}</span>
    </div>
  ));
}

export function StatsBar({ stats = {}, total = 0 }) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.totalBlock}>
          <span className={styles.totalNum}>{total.toLocaleString('ru')}</span>
          <span className={styles.totalLabel}>проектов в базе</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.sources}>
          <SourceList sources={RU_SOURCES} stats={stats} />
        </div>
        <div className={styles.divider} />
        <div className={styles.sources}>
          <SourceList sources={INT_SOURCES} stats={stats} />
        </div>
      </div>
    </div>
  );
}
