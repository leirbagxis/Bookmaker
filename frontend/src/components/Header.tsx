import { useWebSocket } from '../context/WebSocketContext';
import { useUser } from '../context/UserContext';
import type { ConnectionStatus } from '../types/websocket';

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Conectando...',
  open: 'Online',
  closed: 'Reconectando...',
  error: 'Offline',
};

const DOT_COLOR: Record<ConnectionStatus, string> = {
  connecting: 'bg-warning',
  open: 'bg-success',
  closed: 'bg-warning',
  error: 'bg-error',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function Header() {
  const { status, reconnect } = useWebSocket();
  const { user } = useUser();

  return (
    <header className="bg-panel rounded-b-[2rem] shadow-sm px-lg py-md flex items-center justify-between z-50 relative sticky top-0">
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-accent font-black text-xl">
          SB
        </div>
        <span className="font-black uppercase tracking-tight text-xl hidden sm:inline">SuperBet</span>
      </div>
      
      <div className="flex items-center gap-md">
        {user && (
          <div className="flex flex-col items-end">
            <span className="status-label !mb-0">Saldo</span>
            <strong className="font-black text-primary bg-accent px-3 py-1 rounded-xl text-sm">{formatCurrency(user.balance)}</strong>
          </div>
        )}
        
        <button
          type="button"
          onClick={reconnect}
          className="flex items-center gap-xs bg-surface px-3 py-2 rounded-full hover:bg-border transition-colors"
          aria-label="Status da conexão"
        >
          <span className={`w-2 h-2 rounded-full ${DOT_COLOR[status]} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted hidden sm:inline">{LABEL[status]}</span>
        </button>
      </div>
    </header>
  );
}
