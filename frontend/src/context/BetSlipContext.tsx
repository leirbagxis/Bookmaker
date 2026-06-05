import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OddSelection } from '../types/odds';

const STORAGE_KEY = 'superbet.betslip.v1';

export type BetSlipItem = {
  selection: OddSelection;
  addedAt: number;
};

type BetSlipContextValue = {
  items: BetSlipItem[];
  stake: number;
  totalOdd: number;
  potentialReturn: number;
  add: (selection: OddSelection) => void;
  remove: (id: string) => void;
  clear: () => void;
  setStake: (n: number) => void;
  confirm: () => string;
};

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

function loadItems(): BetSlipItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BetSlipItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveItems(items: BetSlipItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignora
  }
}

function uniqueKey(s: OddSelection): string {
  return `${s.eventId}::${s.id}::${s.marketId}`;
}

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BetSlipItem[]>(() => loadItems());
  const [stake, setStakeState] = useState<number>(0);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const add = useCallback((selection: OddSelection) => {
    setItems((prev) => {
      const key = uniqueKey(selection);
      const filtered = prev.filter((it) => uniqueKey(it.selection) !== key);
      return [...filtered, { selection, addedAt: Date.now() }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.selection.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const setStake = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) n = 0;
    setStakeState(n);
  }, []);

  const totalOdd = useMemo(() => {
    return items.reduce((acc, it) => acc * it.selection.price, 1);
  }, [items]);

  const potentialReturn = useMemo(() => {
    return stake * totalOdd;
  }, [stake, totalOdd]);

  const confirm = useCallback(() => {
    if (items.length === 0 || stake <= 0) {
      return 'Adicione seleções e informe um valor para confirmar a aposta simulada.';
    }
    setItems([]);
    setStakeState(0);
    return 'Aposta simulada criada com sucesso.';
  }, [items.length, stake]);

  const value = useMemo<BetSlipContextValue>(
    () => ({ items, stake, totalOdd, potentialReturn, add, remove, clear, setStake, confirm }),
    [items, stake, totalOdd, potentialReturn, add, remove, clear, setStake, confirm]
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip deve ser usado dentro de BetSlipProvider');
  return ctx;
}
