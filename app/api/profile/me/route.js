import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/profile/me — отдаёт минимум данных для клиентских компонентов
// (статус премиума, роль). Если не авторизован — 401.
export async function GET() {
  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    is_premium: profile?.is_premium || false,
    premium_until: profile?.premium_until || null,
    user_role: profile?.user_role || null,
    is_admin: profile?.is_admin || false,
  });
}
