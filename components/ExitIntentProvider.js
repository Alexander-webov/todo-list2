import { getCurrentUser } from '@/lib/auth';
import { ExitIntent } from './ExitIntent';

// Server component — берёт состояние авторизации и отдаёт клиентскому компоненту
export async function ExitIntentProvider() {
  const { user } = await getCurrentUser();
  return <ExitIntent isLoggedIn={!!user} />;
}
