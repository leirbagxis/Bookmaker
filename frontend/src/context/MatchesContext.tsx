import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import type { CompetitionGroup } from '../types/match';

type MatchesContextValue = {
  groups: CompetitionGroup[] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => void;
};

const MatchesContext = createContext<MatchesContextValue | null>(null);

export function MatchesProvider({ children }: { children: ReactNode }) {
  const { status, send, subscribe } = useWebSocket();
  const [groups, setGroups] = useState<CompetitionGroup[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchMatches = useCallback(() => {
    if (status !== 'open') return;
    // Se já temos dados, não mostramos loading spinner de novo, fazemos background refresh
    if (!groups) setIsLoading(true);
    send({ type: 'GET_TODAY_MATCHES' });
  }, [status, send, groups]);

  useEffect(() => {
    if (status !== 'open') return;

    const unsub = subscribe((msg) => {
      if (msg.type === 'TODAY_MATCHES' || msg.type === 'MATCHES_UPDATED') {
        setGroups(msg.data as CompetitionGroup[]);
        setIsLoading(false);
        setError(null);
        setLastUpdated(Date.now());
      } else if (msg.type === 'ERROR') {
        setError(msg.message);
        setIsLoading(false);
      }
    });

    // Primeira busca
    fetchMatches();

    return unsub;
  }, [status, subscribe, fetchMatches]);

  return (
    <MatchesContext.Provider 
      value={{ 
        groups, 
        isLoading, 
        error, 
        lastUpdated, 
        refresh: fetchMatches 
      }}
    >
      {children}
    </MatchesContext.Provider>
  );
}

export function useMatches() {
  const ctx = useContext(MatchesContext);
  if (!ctx) throw new Error('useMatches deve ser usado dentro de MatchesProvider');
  return ctx;
}
