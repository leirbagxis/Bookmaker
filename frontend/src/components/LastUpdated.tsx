import { useTimeAgo } from '../hooks/useTimeAgo';

type Props = {
  timestamp: number | null;
  label?: string;
};

export function LastUpdated({ timestamp, label = 'Atualizado' }: Props) {
  const text = useTimeAgo(timestamp, 5000);
  if (!text) return null;
  return (
    <span 
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap" 
      title={timestamp ? new Date(timestamp).toLocaleString('pt-BR') : ''}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
      <span>{label} {text}</span>
    </span>
  );
}
