'use client';
import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const TABS = ['stats', 'articles', 'premium', 'telegram'];

export function AdminClient({ gifts, totalUsers, premiumUsers }) {
  const [tab, setTab] = useState('stats');

  // Premium gift state
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);
  const [webhookInfo, setWebhookInfo] = useState(null);

  // Blog state
  const [articles, setArticles] = useState([]);
  const [artLoading, setArtLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null = list, {} = new, {id,...} = edit
  const [artForm, setArtForm] = useState({
    slug: '', title: '', description: '', keywords: '',
    content: '', emoji: '📝', published: true,
  });
  const [artResult, setArtResult] = useState(null);

  // Ads state
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [adForm, setAdForm] = useState({
    title: '', description: '', image_url: '', link: '',
    position: 'feed', is_active: true, priority: 0,
  });
  const [adResult, setAdResult] = useState(null);

  useEffect(() => {
    if (tab === 'articles') loadArticles();
    if (tab === 'ads') loadAds();
  }, [tab]);

  async function loadAds() {
    setAdsLoading(true);
    try {
      const res = await fetch('/api/admin/ads');
      const data = await res.json();
      setAds(data.ads || []);
    } catch { }
    finally { setAdsLoading(false); }
  }

  async function saveAd(e) {
    e.preventDefault();
    setAdsLoading(true); setAdResult(null);
    try {
      const method = editingAd?.id ? 'PUT' : 'POST';
      const body = editingAd?.id ? { ...adForm, id: editingAd.id } : adForm;
      const res = await fetch('/api/admin/ads', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ad) {
        setAdResult({ ok: true, msg: editingAd?.id ? 'Обновлено' : 'Создано' });
        setEditingAd(null);
        setAdForm({ title: '', description: '', image_url: '', link: '', position: 'feed', is_active: true, priority: 0 });
        loadAds();
      } else {
        setAdResult({ ok: false, msg: data.error });
      }
    } catch { setAdResult({ ok: false, msg: 'Ошибка' }); }
    finally { setAdsLoading(false); }
  }

  async function deleteAd(id) {
    if (!confirm('Удалить?')) return;
    await fetch(`/api/admin/ads?id=${id}`, { method: 'DELETE' });
    loadAds();
  }

  async function loadArticles() {
    setArtLoading(true);
    const res = await fetch('/api/admin/articles');
    const data = await res.json();
    setArticles(data.articles || []);
    setArtLoading(false);
  }

  function startNew() {
    setArtForm({ slug: '', title: '', description: '', keywords: '', content: '', emoji: '📝', published: true });
    setEditing({});
    setArtResult(null);
  }

  function startEdit(a) {
    setArtForm({ slug: a.slug, title: a.title, description: a.description || '',
      keywords: a.keywords || '', content: a.content, emoji: a.emoji || '📝',
      published: a.published });
    setEditing(a);
    setArtResult(null);
  }

  async function saveArticle() {
    setArtLoading(true);
    setArtResult(null);
    const res = await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...artForm, id: editing?.id }),
    });
    const data = await res.json();
    setArtResult(data);
    if (data.success) {
      setEditing(null);
      loadArticles();
    }
    setArtLoading(false);
  }

  async function deleteArticle(id) {
    if (!confirm('Удалить статью?')) return;
    await fetch('/api/admin/articles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadArticles();
  }

  async function giftPremium(e) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/admin/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, days: parseInt(days), note }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) { setEmail(''); setNote(''); }
    } catch { setResult({ error: 'Ошибка соединения' }); }
    finally { setLoading(false); }
  }

  async function registerWebhook(e) {
    e.preventDefault();
    setWebhookLoading(true); setWebhookResult(null);
    try {
      const res = await fetch('/api/admin/telegram-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.replace(/\/$/, '') }),
      });
      setWebhookResult(await res.json());
    } catch { setWebhookResult({ ok: false, description: 'Ошибка соединения' }); }
    finally { setWebhookLoading(false); }
  }

  async function checkWebhook() {
    setWebhookLoading(true);
    try {
      const res = await fetch('/api/admin/telegram-webhook');
      const data = await res.json();
      setWebhookInfo(data.result || data);
    } catch { setWebhookInfo({ error: 'Ошибка' }); }
    finally { setWebhookLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.back}>← Назад</a>
        <h1 className={styles.title}>🛡 Админ-панель</h1>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['stats','📊 Статистика'],['articles','📝 Статьи'],['ads','📣 Реклама'],['premium','🎁 Премиум'],['telegram','🤖 Telegram']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: tab === key ? 'var(--accent)' : 'var(--bg-card)',
            color: tab === key ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {/* Статистика */}
      {tab === 'stats' && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <p className={styles.statNum}>{totalUsers}</p>
            <p className={styles.statLabel}>Всего пользователей</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statNum}>{premiumUsers}</p>
            <p className={styles.statLabel}>Премиум активных</p>
          </div>
        </div>
      )}

      {/* Статьи блога */}
      {tab === 'articles' && (
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Статьи блога</h2>
            {!editing && (
              <button onClick={startNew} style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700,
              }}>+ Новая статья</button>
            )}
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="emoji (📝)" value={artForm.emoji}
                  onChange={e => setArtForm(f => ({...f, emoji: e.target.value}))}
                  className={styles.input} style={{ width: 80 }} />
                <input placeholder="slug (kak-najti-zakazy)" value={artForm.slug}
                  onChange={e => setArtForm(f => ({...f, slug: e.target.value}))}
                  className={styles.input} style={{ flex: 1 }} />
              </div>
              <input placeholder="Заголовок статьи" value={artForm.title}
                onChange={e => setArtForm(f => ({...f, title: e.target.value}))}
                className={styles.input} />
              <input placeholder="Краткое описание (для SEO)" value={artForm.description}
                onChange={e => setArtForm(f => ({...f, description: e.target.value}))}
                className={styles.input} />
              <input placeholder="Ключевые слова через запятую" value={artForm.keywords}
                onChange={e => setArtForm(f => ({...f, keywords: e.target.value}))}
                className={styles.input} />
              <textarea placeholder={`Текст статьи в Markdown формате.\n\n## Заголовок\n\nПараграф текста...\n\n## Ещё заголовок\n\nЕщё текст.`}
                value={artForm.content}
                onChange={e => setArtForm(f => ({...f, content: e.target.value}))}
                rows={20}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 16px', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6,
                }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={artForm.published}
                  onChange={e => setArtForm(f => ({...f, published: e.target.checked}))} />
                Опубликована
              </label>
              {artResult && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: artResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: artResult.success ? '#22c55e' : '#ef4444',
                  border: `1px solid ${artResult.success ? '#22c55e30' : '#ef444430'}`,
                }}>
                  {artResult.success ? '✓ Сохранено!' : artResult.error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveArticle} disabled={artLoading} style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700,
                }}>{artLoading ? 'Сохраняю...' : '💾 Сохранить'}</button>
                <button onClick={() => setEditing(null)} style={{
                  background: 'var(--border)', color: 'var(--text-muted)', border: 'none',
                  borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
                }}>Отмена</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {artLoading && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</p>}
              {articles.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{a.emoji}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        /{a.slug} · {a.published ? '✓ опубл.' : '○ черновик'} ·{' '}
                        {format(new Date(a.created_at), 'd MMM yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`/blog/${a.slug}`} target="_blank" style={{
                      fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                      padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: 6,
                    }}>👁 Просмотр</a>
                    <button onClick={() => startEdit(a)} style={{
                      fontSize: 12, color: 'var(--text-muted)', background: 'var(--border)',
                      border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                    }}>✏️ Редактировать</button>
                    <button onClick={() => deleteArticle(a.id)} style={{
                      fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
                      padding: '5px 10px', cursor: 'pointer',
                    }}>🗑</button>
                  </div>
                </div>
              ))}
              {!artLoading && articles.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Статей пока нет. Создай первую!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Премиум */}
      {tab === 'premium' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Подарить премиум</h2>
          <form className={styles.giftForm} onSubmit={giftPremium}>
            <div className={styles.formRow}>
              <input type="email" required placeholder="Email пользователя"
                className={styles.input} value={email}
                onChange={e => setEmail(e.target.value)} />
              <input type="number" min="1" max="3650" required placeholder="Дней"
                className={`${styles.input} ${styles.inputDays}`}
                value={days} onChange={e => setDays(e.target.value)} />
            </div>
            <input type="text" placeholder="Заметка (необязательно)"
              className={styles.input} value={note}
              onChange={e => setNote(e.target.value)} />
            <button type="submit" className={styles.giftBtn} disabled={loading}>
              {loading ? 'Дарим...' : '🎁 Подарить'}
            </button>
          </form>
          {result && (
            <div className={`${styles.result} ${result.success ? styles.resultOk : styles.resultErr}`}>
              {result.message || result.error}
              {result.premium_until && (
                <p className={styles.resultSub}>
                  Активен до: {format(new Date(result.premium_until), 'd MMMM yyyy', { locale: ru })}
                </p>
              )}
            </div>
          )}
          {gifts.length > 0 && (
            <div className={styles.giftList} style={{ marginTop: 20 }}>
              {gifts.map(g => (
                <div key={g.id} className={styles.giftRow}>
                  <div>
                    <p className={styles.giftEmail}>{g.profiles?.email || g.user_id}</p>
                    {g.note && <p className={styles.giftNote}>{g.note}</p>}
                  </div>
                  <div className={styles.giftRight}>
                    <span className={styles.giftDays}>+{g.days} дней</span>
                    <span className={styles.giftDate}>
                      {format(new Date(g.created_at), 'd MMM', { locale: ru })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Telegram */}
      {tab === 'telegram' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Управление публикациями</h2>
          <a href="/admin/telegram-queue" style={{
            display: 'block', padding: '14px 18px', marginBottom: 24,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', textDecoration: 'none',
            color: 'var(--text)', fontSize: 14, fontWeight: 600,
            transition: 'border-color 0.15s',
          }}>
            ⚙️ Очередь постинга · лимиты · СТАРТ/СТОП →
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginTop: 4 }}>
              Регулировка количества постов в сутки, фильтр качества, статистика
            </div>
          </a>

          <h2 className={styles.sectionTitle}>Telegram Bot Webhook</h2>
          <div className={styles.giftForm}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              Укажи URL сайта чтобы бот получал сообщения от пользователей.
            </p>
            <form onSubmit={registerWebhook} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="url" required placeholder="https://твой-домен.vercel.app"
                className={styles.input} value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className={styles.giftBtn} disabled={webhookLoading} style={{ flex: 1 }}>
                  {webhookLoading ? '...' : '🔗 Зарегистрировать webhook'}
                </button>
                <button type="button" className={styles.giftBtn} disabled={webhookLoading}
                  onClick={checkWebhook}
                  style={{ flex: 1, background: 'var(--border)', color: 'var(--text-muted)' }}>
                  📋 Проверить статус
                </button>
              </div>
            </form>
            {webhookResult && (
              <div className={`${styles.result} ${webhookResult.ok ? styles.resultOk : styles.resultErr}`}>
                {webhookResult.ok
                  ? `✅ Webhook зарегистрирован: ${webhookResult.registeredUrl}`
                  : `❌ ${webhookResult.description || webhookResult.error}`}
              </div>
            )}
            {webhookInfo && (
              <div className={styles.result} style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                <b>Текущий webhook:</b><br />
                URL: {webhookInfo.url || 'не задан'}<br />
                Ожидает: {webhookInfo.pending_update_count ?? '—'}<br />
                {webhookInfo.last_error_message && `Ошибка: ${webhookInfo.last_error_message}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Реклама */}
      {tab === 'ads' && (
        <div>
          {!editingAd ? (
            <div>
              <button onClick={() => { setEditingAd({}); setAdForm({ title: '', description: '', image_url: '', link: '', position: 'telegram', is_active: true, priority: 0, tg_pin_hours: 2, tg_keep_hours: 48 }); }}
                style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginBottom: 16 }}>
                + Добавить рекламу
              </button>
              {adsLoading ? <p>Загрузка...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ads.map(ad => (
                    <div key={ad.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14 }}>
                            {ad.is_active ? '🟢' : '🔴'} {ad.title}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            {ad.position} · приоритет: {ad.priority} · 👁 {ad.views || 0} · 👆 {ad.clicks || 0}
                            {ad.tg_posted_at && ` · 📢 ${new Date(ad.tg_posted_at).toLocaleString('ru')}`}
                          </p>
                          {ad.tg_posted_at && (
                            <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                              ⏸ Тишина {ad.tg_pin_hours || 2}ч · Удаление через {ad.tg_keep_hours || 48}ч
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {(ad.position === 'telegram' || ad.position === 'all') && !ad.tg_posted_at && (
                            <button onClick={async () => {
                              if (!confirm(`Опубликовать "${ad.title}" в канал?\nТишина ${ad.tg_pin_hours || 2}ч, удаление через ${ad.tg_keep_hours || 48}ч`)) return;
                              setAdsLoading(true);
                              const res = await fetch('/api/admin/ads/publish', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: ad.id }),
                              });
                              const data = await res.json();
                              alert(data.ok ? '✅ Опубликовано!' : `❌ ${data.error}`);
                              loadAds();
                            }}
                              style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.15)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>📢 В канал</button>
                          )}
                          <button onClick={() => { setEditingAd(ad); setAdForm({ title: ad.title, description: ad.description || '', image_url: ad.image_url || '', link: ad.link, position: ad.position, is_active: ad.is_active, priority: ad.priority || 0, tg_pin_hours: ad.tg_pin_hours || 2, tg_keep_hours: ad.tg_keep_hours || 48 }); }}
                            style={{ padding: '6px 12px', background: 'var(--border)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                          <button onClick={() => deleteAd(ad.id)}
                            style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ads.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Нет объявлений</p>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button onClick={() => setEditingAd(null)} style={{ marginBottom: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>← Назад к списку</button>
              <h2 style={{ marginBottom: 16 }}>{editingAd.id ? 'Редактировать' : 'Новое объявление'}</h2>
              <form onSubmit={saveAd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input placeholder="Заголовок *" value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} required
                  className={styles.input} />
                <textarea placeholder="Описание" value={adForm.description} onChange={e => setAdForm({...adForm, description: e.target.value})} rows={3}
                  className={styles.input} style={{ resize: 'vertical' }} />
                <input placeholder="Ссылка *" value={adForm.link} onChange={e => setAdForm({...adForm, link: e.target.value})} required
                  className={styles.input} />
                <input placeholder="URL картинки (опционально)" value={adForm.image_url} onChange={e => setAdForm({...adForm, image_url: e.target.value})}
                  className={styles.input} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13 }}>Позиция:</label>
                  <select value={adForm.position} onChange={e => setAdForm({...adForm, position: e.target.value})}
                    className={styles.input} style={{ width: 'auto' }}>
                    <option value="feed">В ленте</option>
                    <option value="sidebar">В сайдбаре</option>
                    <option value="telegram">В Telegram</option>
                    <option value="all">Везде</option>
                  </select>
                  <label style={{ fontSize: 13 }}>Приоритет:</label>
                  <input type="number" value={adForm.priority} onChange={e => setAdForm({...adForm, priority: parseInt(e.target.value)||0})}
                    className={styles.input} style={{ width: 70 }} />
                </div>
                {(adForm.position === 'telegram' || adForm.position === 'all') && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(59,130,246,0.08)', padding: 12, borderRadius: 8 }}>
                    <label style={{ fontSize: 13 }}>⏸ Тишина (часы):</label>
                    <input type="number" value={adForm.tg_pin_hours} onChange={e => setAdForm({...adForm, tg_pin_hours: parseInt(e.target.value)||2})}
                      className={styles.input} style={{ width: 60 }} min="0" />
                    <label style={{ fontSize: 13 }}>🗑 Удалить через (часы):</label>
                    <input type="number" value={adForm.tg_keep_hours} onChange={e => setAdForm({...adForm, tg_keep_hours: parseInt(e.target.value)||48})}
                      className={styles.input} style={{ width: 60 }} min="0" />
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={adForm.is_active} onChange={e => setAdForm({...adForm, is_active: e.target.checked})} />
                  Активно
                </label>
                <button type="submit" disabled={adsLoading}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {adsLoading ? '...' : (editingAd.id ? 'Сохранить' : 'Создать')}
                </button>
              </form>
              {adResult && (
                <p style={{ marginTop: 10, color: adResult.ok ? 'var(--green)' : 'var(--red)', fontSize: 13 }}>
                  {adResult.ok ? `✅ ${adResult.msg}` : `❌ ${adResult.msg}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
