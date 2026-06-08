import type { OddSelection } from '../types/odds';
import { useBetSlip, getSelectionKey } from '../context/BetSlipContext';
import { useOddChange } from '../hooks/useOddChange';

type Props = {
  selection: OddSelection;
  compact?: boolean;
};

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return n.toFixed(2);
}

export function OddButton({ selection, compact }: Props) {
  const { items, add, remove } = useBetSlip();
  const key = getSelectionKey(selection);
  const selected = items.some((it) => getSelectionKey(it.selection) === key);
  const isLocked = selection.price <= 1.0;

  const { change, flash } = useOddChange(selection.price, key);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLocked) return;
    if (selected) {
      remove(selection);
    } else {
      add(selection);
    }
  };

  const classes = [
    'odd-button',
    selected && 'odd-button--selected',
    compact && 'odd-button--compact',
    isLocked && 'odd-button--locked',
    flash && change === 'up' && 'odd-button--flash-up',
    flash && change === 'down' && 'odd-button--flash-down',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      disabled={isLocked}
      aria-pressed={selected}
    >
      <span className="odd-button__name">{selection.name}</span>
      <span className="odd-button__price">
        <span className="odd-button__price-value">{formatPrice(selection.price)}</span>
        {!isLocked && change !== 'same' && (
          <span className={`odd-button__arrow odd-button__arrow--${change}`} aria-hidden="true">
            {change === 'up' ? '▲' : '▼'}
          </span>
        )}
      </span>
      {isLocked && (
        <span className="odd-button__locked-overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </span>
      )}
    </button>
  );
}
