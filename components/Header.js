import { getCurrentUser } from '@/lib/auth';
import { HeaderClient } from './HeaderClient';

export async function Header() {
  const { user, profile } = await getCurrentUser();

  const isPremium = !!profile?.is_premium && (
    !profile?.premium_until || new Date(profile.premium_until) > new Date()
  );

  return (
    <HeaderClient
      user={user ? { email: user.email } : null}
      isAdmin={profile?.is_admin || false}
      isPremium={isPremium}
    />
  );
}
