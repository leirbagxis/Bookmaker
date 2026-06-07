import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { OddSelection } from '../types/odds';
import { useWebSocket } from './WebSocketContext';

const STORAGE_KEY = 'superbet.betslip.v1';

export type BetSlipItem = {
  selection: OddSelection;
  addedAt: number;
};

export function getSelectionKey(s: OddSelection): string {
  return `${s.eventId}::${s.marketId}::${s.id}`;
}

type BetSlipContextValue = {
  items: BetSlipItem[];
  stake: number;
  totalOdd: number;
  potentialReturn: number;
  lastTicketId: string | null;
  add: (selection: OddSelection) => void;
  remove: (selection: OddSelection) => void;
  clear: () => void;
  setStake: (n: number) => void;
  confirm: () => Promise<string>;
  clearLastTicket: () => void;
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

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const { status, send, subscribe } = useWebSocket();
  const [items, setItems] = useState<BetSlipItem[]>(() => loadItems());
  const [stake, setStakeState] = useState<number>(0);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const add = useCallback((selection: OddSelection) => {
    setItems((prev) => {
      // Regra de múltiplas: Apenas uma seleção por evento
      const filtered = prev.filter((it) => it.selection.eventId !== selection.eventId);
      return [...filtered, { selection, addedAt: Date.now() }];
    });
  }, []);

  const remove = useCallback((selection: OddSelection) => {
    const key = getSelectionKey(selection);
    setItems((prev) => prev.filter((it) => getSelectionKey(it.selection) !== key));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const clearLastTicket = useCallback(() => {
    setLastTicketId(null);
  }, []);

  const setStake = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) n = 0;
    setStakeState(n);
  }, []);

  const totalOdd = useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((acc, it) => acc * it.selection.price, 1);
  }, [items]);

  const potentialReturn = useMemo(() => {
    return stake * totalOdd;
  }, [stake, totalOdd]);

  const confirm = useCallback(() => {
    return new Promise<string>((resolve) => {
      if (items.length === 0 || stake <= 0) {
        return resolve('Adicione seleções e informe um valor para apostar.');
      }
      if (status !== 'open') {
        return resolve('Sem conexão com o servidor.');
      }

      const selections = items.map(it => it.selection);
      
      const unsub = subscribe((msg) => {
        if (msg.type === 'BET_PLACED') {
          if (msg.data?.id) {
            setLastTicketId(msg.data.id);
          }
          setItems([]);
          setStakeState(0);
          resolve(msg.message);
          unsub();
        } else if (msg.type === 'ERROR') {
          resolve(msg.message);
          unsub();
        }
      });

      send({
        type: 'PLACE_BET',
        amount: stake,
        selections: selections
      });

      // Timeout de segurança
      setTimeout(() => {
        unsub();
        resolve('Tempo esgotado ao tentar realizar a aposta.');
      }, 5000);
    });
  }, [items, stake, status, send, subscribe]);

  const value = useMemo<BetSlipContextValue>(
    () => ({ items, stake, totalOdd, potentialReturn, lastTicketId, add, remove, clear, setStake, confirm, clearLastTicket }),
    [items, stake, totalOdd, potentialReturn, lastTicketId, add, remove, clear, setStake, confirm, clearLastTicket]
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip deve ser usado dentro de BetSlipProvider');
  return ctx;
}
