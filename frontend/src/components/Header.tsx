import { useWebSocket } from '../context/WebSocketContext';
import type { ConnectionStatus } from '../types/websocket';

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando...',
  open: 'Online',
  closed: 'Reconectando...',
  error: 'Sem conexão',
};

export function Header() {
  const { status, reconnect } = useWebSocket();
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo">SB</span>
        <span className="app-header__title">SuperBet</span>
      </div>
      <button
        type="button"
        className={`app-header__status app-header__status--${status}`}
        onClick={reconnect}
        aria-label="Status da conexão"
      >
        <span className="app-header__status-dot" />
        <span className="app-header__status-text">{LABEL[status]}</span>
      </button>
    </header>
  );
}
