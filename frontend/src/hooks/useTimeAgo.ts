import { useEffect, useState } from 'react';

/**
 * Retorna o texto "há Xs" / "há Xmin" relativo ao timestamp fornecido,
 * atualizado a cada `intervalMs` milissegundos.
 */
export function useTimeAgo(timestamp: number | null, intervalMs = 5000): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (timestamp === null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [timestamp, intervalMs]);

  if (timestamp === null) return '';

  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 5) return 'agora';
  if (diff < 60) return `há ${diff}s`;
  const min = Math.floor(diff / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h`;
}
