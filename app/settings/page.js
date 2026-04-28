import { getCurrentUser } from '@/lib/auth';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Header } from '@/components/Header';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Настройка профиля | FreelanceHere',
};

export default async function SettingsPage() {
  const { profile } = await getCurrentUser();
  if (!profile) redirect('/login');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <a href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
          ← Назад к проектам
        </a>
        <ProfileSettings profile={profile} />
      </div>
    </div>
  );
}
