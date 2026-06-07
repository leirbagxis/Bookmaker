import { useWebSocket } from '../context/WebSocketContext';
import { useUser } from '../context/UserContext';
import type { ConnectionStatus } from '../types/websocket';

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando...',
  open: 'Online',
  closed: 'Reconectando...',
  error: 'Sem conexão',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function Header() {
  const { status, reconnect } = useWebSocket();
  const { user } = useUser();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo">SB</span>
        <span className="app-header__title">SuperBet</span>
      </div>
      
      <div className="app-header__right">
        {user && (
          <div className="app-header__balance">
            <span className="app-header__balance-label">Saldo</span>
            <strong className="app-header__balance-value">{formatCurrency(user.balance)}</strong>
          </div>
        )}
        
        <button
          type="button"
          className={`app-header__status app-header__status--${status}`}
          onClick={reconnect}
          aria-label="Status da conexão"
        >
          <span className="app-header__status-dot" />
          <span className="app-header__status-text">{LABEL[status]}</span>
        </button>
      </div>
    </header>
  );
}
