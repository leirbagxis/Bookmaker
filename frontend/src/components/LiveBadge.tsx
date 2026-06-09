type Props = {
  liveMinute?: number | null;
  clock?: string | null;
  size?: 'sm' | 'md';
};

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatTime(minute: number): string {
  if (minute <= 45) return `${minute}'`;
  if (minute <= 60) return `45+${minute - 45}'`;
  if (minute <= 90) return `${minute}'`;
  if (minute <= 105) return `90+${minute - 90}'`;
  return `${minute}'`;
}

export function LiveBadge({ liveMinute, clock, size = 'sm' }: Props) {
  let label = 'AO VIVO';
  if (clock && clock.trim()) {
    label = clock.trim().toUpperCase();
    const n = normalize(label);
    if (n === 'ht' || n === 'intervalo') label = 'INTERVALO';
  } else if (typeof liveMinute === 'number' && liveMinute > 0) {
    label = formatTime(liveMinute);
  }
  
  const textClass = size === 'sm' ? 'text-[9px]' : 'text-xs';
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  
  return (
    <span className={`inline-flex items-center gap-1.5 bg-primary text-black font-black tracking-widest uppercase rounded-sm ${paddingClass} ${textClass}`} aria-label="Jogo ao vivo">
      <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
