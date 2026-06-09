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

  const baseClasses = "relative flex flex-col items-center justify-center gap-0.5 w-full rounded-md transition-all duration-200 overflow-hidden outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-primary";
  const sizeClasses = compact ? "min-h-[44px] px-1 py-1" : "min-h-[54px] px-2 py-2";
  const stateClasses = isLocked 
    ? "cursor-not-allowed bg-surface/50 border border-border/50 opacity-90" 
    : selected 
      ? "bg-primary text-black border-2 border-primary shadow-sm" 
      : "bg-surface border border-border hover:border-muted text-accent hover:bg-white hover:shadow-sm";
  
  const flashClasses = flash && change === 'up' ? "bg-success/20 transition-none" : flash && change === 'down' ? "bg-error/20 transition-none" : "";

  return (
    <button
      type="button"
      className={`${baseClasses} ${sizeClasses} ${stateClasses} ${flashClasses}`}
      onClick={handleClick}
      disabled={isLocked}
      aria-pressed={selected}
    >
      <span className={`text-[9px] font-bold tracking-tight uppercase truncate w-full text-center ${selected ? 'text-black/70' : 'text-muted'}`}>{selection.name}</span>
      <span className="flex items-center justify-center gap-1 font-black text-sm">
        <span>{formatPrice(selection.price)}</span>
        {!isLocked && change !== 'same' && (
          <span className={change === 'up' ? 'text-success' : 'text-error'} aria-hidden="true">
            {change === 'up' ? '▲' : '▼'}
          </span>
        )}
      </span>
      {isLocked && (
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      )}
    </button>
  );
}
