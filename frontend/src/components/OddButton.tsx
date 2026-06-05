import type { OddSelection } from '../types/odds';
import { useBetSlip } from '../context/BetSlipContext';

type Props = {
  selection: OddSelection;
  compact?: boolean;
};

function uniqueKey(s: OddSelection): string {
  return `${s.eventId}::${s.id}::${s.marketId}`;
}

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return n.toFixed(2);
}

export function OddButton({ selection, compact }: Props) {
  const { items, add } = useBetSlip();
  const key = uniqueKey(selection);
  const selected = items.some((it) => uniqueKey(it.selection) === key);

  return (
    <button
      type="button"
      className={`odd-button${selected ? ' odd-button--selected' : ''}${compact ? ' odd-button--compact' : ''}`}
      onClick={() => add(selection)}
      aria-pressed={selected}
    >
      <span className="odd-button__name">{selection.name}</span>
      <span className="odd-button__price">{formatPrice(selection.price)}</span>
    </button>
  );
}
