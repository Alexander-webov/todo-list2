import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

// POST /api/email-capture
// body: { email, project_id?, source? }
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  // Хешируем IP для rate-limiting / защиты от спама (сам IP не храним)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ipHash = createHash('sha256').update(ip + (process.env.CRON_SECRET || '')).digest('hex').slice(0, 32);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300);

  const db = supabaseAdmin();

  // Проверяем rate-limit: с одного IP не больше 5 захватов за час
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db
    .from('email_captures')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourAgo);

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }

  const { error } = await db.from('email_captures').insert({
    email,
    project_id: body.project_id || null,
    source: body.source || 'exit_intent',
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (error) {
    console.error('[EmailCapture]', error.message);
    return NextResponse.json({ error: 'save failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
