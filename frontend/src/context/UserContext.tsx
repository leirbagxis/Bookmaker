import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';

type User = {
  id: number;
  username: string;
  balance: number;
};

type Ticket = any; // Podemos tipar melhor depois ou usar o do backend

type UserContextValue = {
  user: User | null;
  tickets: Ticket[];
  isLoading: boolean;
  isTicketsLoading: boolean;
  fetchTickets: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { status, subscribe } = useWebSocket();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setIsTicketsLoading(true);
    try {
      const resp = await fetch(`/api/bets?username=${user.username}`);
      if (resp.ok) {
        const data = await resp.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setIsTicketsLoading(false);
    }
  }, [user]);

  const login = useCallback(async (username: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (resp.ok) {
        const data = await resp.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Auto-login demo
    login('usuario_demo');
  }, [login]);

  useEffect(() => {
    if (status !== 'open') return;

    const unsub = subscribe((msg) => {
      if (msg.type === 'BALANCE_UPDATE') {
        setUser(msg.data as User);
      } else if (msg.type === 'ERROR') {
        console.error('WebSocket User Error:', msg.message);
      }
    });

    return unsub;
  }, [status, subscribe]);

  return (
    <UserContext.Provider value={{ user, tickets, isLoading, isTicketsLoading, fetchTickets }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser deve ser usado dentro de UserProvider');
  return ctx;
}
