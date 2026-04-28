import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase.js';

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    const authCookie = allCookies.find(c =>
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!authCookie?.value) return { user: null, profile: null };

    let accessToken;
    try {
      const parsed = JSON.parse(authCookie.value);
      accessToken = parsed.access_token;
    } catch {
      return { user: null, profile: null };
    }

    if (!accessToken) return { user: null, profile: null };

    const db = supabaseAdmin();
    const { data: { user }, error } = await db.auth.getUser(accessToken);

    if (error || !user) return { user: null, profile: null };

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
