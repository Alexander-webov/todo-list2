import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { submissionId, action, note } = body || {};
  if (!submissionId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: submission } = await db
    .from('course_submissions')
    .select('id, user_id, course_id, status')
    .eq('id', submissionId)
    .single();

  if (!submission) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
  if (submission.status !== 'pending') {
    return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 400 });
  }

  await db.from('course_submissions').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    admin_note: note || null,
    reviewer_id: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', submissionId);

  if (action === 'approve') {
    const { data: course } = await db
      .from('courses')
      .select('id, title, reward_amount')
      .eq('id', submission.course_id)
      .single();

    if (course) {
      // Тот же UNIQUE-индекс (user_id, course_id) при type='course_reward'
      // не даёт начислить дважды, даже если кто-то дважды нажмёт "одобрить".
      const { error: txError } = await db.from('wallet_transactions').insert({
        user_id: submission.user_id,
        amount: course.reward_amount,
        type: 'course_reward',
        course_id: course.id,
        description: `Прохождение курса «${course.title}» (проверено админом)`,
      });

      if (!txError) {
        const { data: userProfile } = await db.from('profiles').select('wallet_balance').eq('id', submission.user_id).single();
        await db
          .from('profiles')
          .update({ wallet_balance: (userProfile?.wallet_balance || 0) + course.reward_amount })
          .eq('id', submission.user_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
