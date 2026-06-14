import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from './supabase.js';

function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // В server components/API без response здесь ничего не записываем.
          // Обновлением auth cookies занимается middleware.
        },
        remove() {
          // См. комментарий выше.
        },
      },
    }
  );
}

export async function getCurrentUser() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return { user: null, profile: null };

    const db = supabaseAdmin();
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Если премиум истёк — обновляем в БД автоматически
    if (profile?.is_premium && profile?.premium_until) {
      if (new Date(profile.premium_until) < new Date()) {
        await db
          .from('profiles')
          .update({ is_premium: false })
          .eq('id', user.id);
        profile.is_premium = false;
      }
    }

    return { user, profile: profile || null };
  } catch (err) {
    console.error('[getCurrentUser]', err.message);
    return { user: null, profile: null };
  }
}

export async function activatePremium(userId, days = 30) {
  const db = supabaseAdmin();
  await db.rpc('activate_premium', { p_user_id: userId, p_days: days });
}
