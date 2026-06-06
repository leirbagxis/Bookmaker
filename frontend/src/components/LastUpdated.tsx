import { useTimeAgo } from '../hooks/useTimeAgo';

type Props = {
  timestamp: number | null;
  label?: string;
};

export function LastUpdated({ timestamp, label = 'Atualizado' }: Props) {
  const text = useTimeAgo(timestamp, 5000);
  if (!text) return null;
  return (
    <span className="last-updated" title={timestamp ? new Date(timestamp).toLocaleString('pt-BR') : ''}>
      <span className="last-updated__dot" aria-hidden="true" />
      <span className="last-updated__text">{label} {text}</span>
    </span>
  );
}
