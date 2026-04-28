import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { postPaidAdToChannel } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function POST(request) {
  const { profile } = await getCurrentUser();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const result = await postPaidAdToChannel(id);
  return NextResponse.json(result);
}
