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
  return (
    <span className={`live-badge live-badge--${size}`} aria-label="Jogo ao vivo">
      <span className="live-badge__dot" aria-hidden="true" />
      <span className="live-badge__label">{label}</span>
    </span>
  );
}
