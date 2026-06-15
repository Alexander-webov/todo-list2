import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  sendTelegramMessage,
  isPinnedAdActive,
  postFreeAdToChannel,
  getAndIncrementPostCount,
  resolveChannelId,
  AD_EVERY_N_POSTS,
} from '@/lib/telegram';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Cron настроен на запуск раз в 12 минут → 5 запусков в час.
// postsPerHour из админки делим на 5, так получаем постов на один запуск.
const RUNS_PER_HOUR = 2;

export async function GET(request) {
  // Защита секретом (как в /api/cron/parse)
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  // 1. Читаем настройки
  const { data: settings } = await db
    .from('telegram_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (!settings) {
    return NextResponse.json({ error: 'settings row missing' }, { status: 500 });
  }

  if (!settings.is_enabled) {
    return NextResponse.json({ skipped: 'disabled' });
  }

  // 2. Платная реклама активна → в канал не постим
  if (await isPinnedAdActive()) {
    return NextResponse.json({ skipped: 'paid_ad_pinned' });
  }

  // 3. Протухшие pending-записи помечаем skipped
  const maxAgeMs = settings.max_queue_age_hours * 3600 * 1000;
  const expiredBefore = new Date(Date.now() - maxAgeMs).toISOString();
  const { count: expiredCount } = await db
    .from('posting_queue')
    .update({ status: 'skipped', error_msg: 'expired' }, { count: 'exact' })
    .eq('status', 'pending')
    .lt('created_at', expiredBefore);

  // 4. Сколько постить за этот запуск
  const postsThisRun = Math.max(1, Math.round(settings.posts_per_hour / RUNS_PER_HOUR));

  // 5. Топ-N из очереди (по обоим каналам вперемешку)
  const { data: candidates, error: selErr } = await db
    .from('posting_queue')
    .select('*')
    .eq('status', 'pending')
    .gte('score', settings.min_score)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(postsThisRun);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  if (!candidates?.length) {
    return NextResponse.json({ posted: 0, expired: expiredCount || 0, reason: 'empty' });
  }

  // 6. Постим по одному, помечаем статус
  const results = [];
  for (const item of candidates) {
    const channelId = resolveChannelId(item.target_channel);
    if (!channelId) {
      await db.from('posting_queue').update({
        status: 'failed',
        error_msg: 'channel not configured',
      }).eq('id', item.id);
      results.push({ id: item.id, ok: false, error: 'channel not configured' });
      continue;
    }

    try {
      // Вставляем бесплатную рекламу каждые AD_EVERY_N_POSTS постов
      const count = await getAndIncrementPostCount();
      if (count % AD_EVERY_N_POSTS === 0) {
        await postFreeAdToChannel(channelId);
        await new Promise(r => setTimeout(r, 500));
      }

      const sent = await sendTelegramMessage(channelId, item.telegram_text, {
        disable_web_page_preview: false,
      });

      if (sent?.message_id) {
        await db.from('posting_queue').update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_message_id: sent.message_id,
        }).eq('id', item.id);

        await db.from('telegram_posts_log').insert({
          queue_id: item.id,
          target_channel: item.target_channel,
          source: item.source,
          category: item.category,
          score: item.score,
        });

        results.push({ id: item.id, ok: true, channel: item.target_channel });
      } else {
        await db.from('posting_queue').update({
          status: 'failed',
          error_msg: 'sendMessage returned null',
        }).eq('id', item.id);
        results.push({ id: item.id, ok: false, error: 'sendMessage returned null' });
      }

      // Лимиты Telegram: не чаще 1 сообщения в секунду на канал
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error('[PostQueue] post error:', err.message);
      await db.from('posting_queue').update({
        status: 'failed',
        error_msg: err.message?.slice(0, 500),
      }).eq('id', item.id);
      results.push({ id: item.id, ok: false, error: err.message });
    }
  }

  const postedCount = results.filter(r => r.ok).length;
  return NextResponse.json({
    posted: postedCount,
    attempted: results.length,
    expired: expiredCount || 0,
    results,
  });
}
