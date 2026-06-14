import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const hourAgo = new Date(now - 3600e3).toISOString();
  const dayAgo = new Date(now - 86400e3).toISOString();

  const [pendingRes, pendingRuRes, pendingIntRes, hourRes, dayLogRes, lastPostRes] = await Promise.all([
    db.from('posting_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('posting_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('target_channel', 'ru'),
    db.from('posting_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('target_channel', 'int'),
    db.from('telegram_posts_log').select('*', { count: 'exact', head: true }).gte('posted_at', hourAgo),
    db.from('telegram_posts_log').select('score, target_channel').gte('posted_at', dayAgo),
    db.from('telegram_posts_log').select('posted_at, target_channel, source, category, score').order('posted_at', { ascending: false }).limit(10),
  ]);

  const todayLog = dayLogRes.data || [];
  const postedToday = todayLog.length;
  const postedTodayRu = todayLog.filter(r => r.target_channel === 'ru').length;
  const postedTodayInt = todayLog.filter(r => r.target_channel === 'int').length;
  const avgScoreToday = postedToday
    ? todayLog.reduce((a, b) => a + (Number(b.score) || 0), 0) / postedToday
    : 0;

  return NextResponse.json({
    pending: pendingRes.count || 0,
    pendingRu: pendingRuRes.count || 0,
    pendingInt: pendingIntRes.count || 0,
    postedLastHour: hourRes.count || 0,
    postedToday,
    postedTodayRu,
    postedTodayInt,
    avgScoreToday: Math.round(avgScoreToday * 10) / 10,
    recent: lastPostRes.data || [],
  });
}

// POST — экстренная очистка очереди (все pending → skipped)
export async function POST(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const db = supabaseAdmin();

  if (action === 'clear_pending') {
    const { count, error } = await db
      .from('posting_queue')
      .update({ status: 'skipped', error_msg: 'manually cleared' }, { count: 'exact' })
      .eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cleared: count || 0 });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
