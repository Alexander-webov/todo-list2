import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const all = cookieStore.getAll();
  return NextResponse.json({
    count: all.length,
    cookies: all.map(c => ({
      name: c.name,
      length: c.value.length,
      preview: c.value.slice(0, 80)
    }))
  });
}
