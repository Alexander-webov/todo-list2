import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { CourseDetailClient } from './CourseDetailClient';

export async function generateMetadata({ params }) {
  const db = supabaseAdmin();
  const { data: course } = await db.from('courses').select('title, description').eq('slug', params.slug).single();
  if (!course) return { title: 'Курс не найден' };
  return {
    title: `${course.title} — курс для фрилансеров | FreelanceHere`,
    description: course.description,
  };
}

export default async function CourseDetailPage({ params }) {
  const db = supabaseAdmin();
  const { data: course } = await db
    .from('courses')
    .select('id, slug, title, description, emoji, reward_amount')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (!course) notFound();

  return (
    <div>
      <Header />
      <CourseDetailClient slug={params.slug} />
    </div>
  );
}
