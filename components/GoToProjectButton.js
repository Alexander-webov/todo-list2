'use client';
import { useRouter } from 'next/navigation';
import { trackApplication } from './ApplicationMotivator';

// Кнопка "Перейти на биржу" которая:
// 1) открывает биржу в новой вкладке
// 2) переводит текущую вкладку на /projects/[id]/responded
// 3) трекает отклик
export function GoToProjectButton({ projectId, url, source, className, children }) {
  const router = useRouter();

  function onClick(e) {
    e.preventDefault();
    trackApplication(projectId, false);
    window.open(url, '_blank', 'noopener,noreferrer');
    router.push(`/projects/${projectId}/responded`);
  }

  return (
    <a href={url} onClick={onClick} className={className}>
      {children || `Перейти к проекту на ${source} →`}
    </a>
  );
}
