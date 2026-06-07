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
  const { status, send, subscribe } = useWebSocket();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);

  const fetchTickets = useCallback(() => {
    if (status !== 'open') return;
    setIsTicketsLoading(true);
    send({ type: 'GET_MY_BETS' });
  }, [status, send]);

  useEffect(() => {
    if (status !== 'open') return;

    const unsub = subscribe((msg) => {
      if (msg.type === 'LOGIN_SUCCESS') {
        setUser(msg.data as User);
        setIsLoading(false);
      } else if (msg.type === 'BALANCE_UPDATE') {
        setUser(msg.data as User);
      } else if (msg.type === 'MY_BETS') {
        const receivedTickets = Array.isArray(msg.data) ? msg.data : [];
        setTickets(receivedTickets);
        setIsTicketsLoading(false);
      } else if (msg.type === 'ERROR') {
        setIsLoading(false);
        setIsTicketsLoading(false);
        console.error('UserContext Error:', msg.message);
      }
    });

    // Auto-login com usuário demo
    send({ type: 'LOGIN', username: 'usuario_demo' });

    return unsub;
  }, [status, send, subscribe]);

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
