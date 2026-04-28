import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db
    .from('blog_articles')
    .select('*')
    .order('created_at', { ascending: false });
  return NextResponse.json({ articles: data || [] });
}

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { id, slug, title, description, keywords, content, emoji, published } = body;
  if (!slug || !title || !content) {
    return NextResponse.json({ error: 'Заполни slug, title и content' }, { status: 400 });
  }
  const db = supabaseAdmin();
  if (id) {
    const { data, error } = await db
      .from('blog_articles')
      .update({ slug, title, description, keywords, content, emoji, published,
        updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, article: data });
  } else {
    const { data, error } = await db
      .from('blog_articles')
      .insert({ slug, title, description, keywords, content, emoji,
        published: published ?? true })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, article: data });
  }
}

export async function DELETE(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await request.json();
  const db = supabaseAdmin();
  await db.from('blog_articles').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
