import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClientMessage, ConnectionStatus, ServerMessage } from '../types/websocket';

type Listener = (msg: ServerMessage) => void;

type WebSocketContextValue = {
  status: ConnectionStatus;
  send: (msg: ClientMessage) => void;
  subscribe: (fn: Listener) => () => void;
  reconnect: () => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const BACKOFF_SCHEDULE = [2000, 5000, 10000, 10000];

function buildUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080/ws';
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}/ws`;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const attemptRef = useRef(0);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    manualCloseRef.current = false;
    setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(buildUrl());
    } catch {
      setStatus('error');
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus('open');
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ServerMessage;
        listenersRef.current.forEach((fn) => fn(parsed));
      } catch {
        // ignora mensagens inválidas
      }
    };

    ws.onerror = () => {
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('closed');
      if (!manualCloseRef.current) {
        scheduleReconnect();
      }
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) return;
    const idx = Math.min(attemptRef.current, BACKOFF_SCHEDULE.length - 1);
    const delay = BACKOFF_SCHEDULE[idx];
    attemptRef.current += 1;
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      manualCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    attemptRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      manualCloseRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const value = useMemo<WebSocketContextValue>(
    () => ({ status, send, subscribe, reconnect }),
    [status, send, subscribe, reconnect]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket deve ser usado dentro de WebSocketProvider');
  return ctx;
}
