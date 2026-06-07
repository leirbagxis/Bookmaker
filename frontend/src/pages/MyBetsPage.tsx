import { useEffect, useState, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

type Tab = 'pending' | 'won' | 'lost';

export function MyBetsPage() {
  const userContext = useUser();
  const { user, tickets = [], isLoading, isTicketsLoading, fetchTickets } = userContext || {};
  
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [sharingTicket, setSharingTicket] = useState<any>(null);

  useEffect(() => {
    if (user && fetchTickets) {
      fetchTickets();
    }
  }, [user, fetchTickets]);

  const filteredTickets = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    return list.filter(t => {
      if (!t) return false;
      const status = (t.status || '').toUpperCase();
      if (activeTab === 'pending') return status === 'PENDING';
      if (activeTab === 'won') return status === 'WON';
      if (activeTab === 'lost') return status === 'LOST';
      return false;
    });
  }, [tickets, activeTab]);

  const formatBRL = (n: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

  const formatFullDate = (iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });
    } catch {
      return iso;
    }
  };

  if (isLoading && !user) {
    return <LoadingState label="Iniciando sessão..." />;
  }

  return (
    <div className="my-bets">
      <header className="my-bets__header">
        <h1 className="my-bets__title">Meus Bilhetes</h1>
        <div className="my-bets__tabs">
          <button 
            className={`my-bets__tab ${activeTab === 'pending' ? 'my-bets__tab--active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Abertas
          </button>
          <button 
            className={`my-bets__tab ${activeTab === 'won' ? 'my-bets__tab--active' : ''}`}
            onClick={() => setActiveTab('won')}
          >
            Ganhas
          </button>
          <button 
            className={`my-bets__tab ${activeTab === 'lost' ? 'my-bets__tab--active' : ''}`}
            onClick={() => setActiveTab('lost')}
          >
            Perdidas
          </button>
        </div>
      </header>

      <div className="my-bets__content">
        {isTicketsLoading && (!tickets || tickets.length === 0) ? (
          <LoadingState label="Carregando bilhetes..." />
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <EmptyState 
              title={activeTab === 'pending' ? "Nenhuma aposta aberta" : "Nenhum bilhete encontrado"}
              description="Suas apostas aparecerão aqui assim que você confirmá-las no bilhete."
            />
            {user && (
              <button 
                onClick={() => fetchTickets && fetchTickets()} 
                className="state__button"
                style={{ marginTop: '20px', background: 'var(--color-bg-elev)', border: '1px solid var(--color-border)', color: 'var(--color-primary-soft)' }}
              >
                Atualizar Histórico
              </button>
            )}
          </div>
        ) : (
          <div className="my-bets__list">
            {filteredTickets.map((ticket, tIdx) => (
              <div key={ticket.id || tIdx} className={`ticket-card ticket-card--${(ticket.status || 'PENDING').toLowerCase()}`}>
                <div className="ticket-card__header">
                  <div className="ticket-card__header-info">
                    <span className="ticket-card__id">ID: {ticket.id || '---'}</span>
                    <span className="ticket-card__date">{formatFullDate(ticket.createdAt)}</span>
                  </div>
                  <button 
                    className="ticket-card__share-btn"
                    onClick={() => setSharingTicket(ticket)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    <span>Compartilhar</span>
                  </button>
                </div>
                
                <ul className="ticket-card__selections">
                  {(ticket.selections || []).map((sel: any, sIdx: number) => (
                    <li key={sIdx} className="ticket-card__selection">
                      <div className="ticket-card__selection-main">
                        <div className="ticket-card__selection-match">{sel.homeTeam || 'Time'} vs {sel.awayTeam || 'Time'}</div>
                        <span className="ticket-card__selection-market">{sel.marketName || 'Mercado'}</span>
                        <span className="ticket-card__selection-name">{sel.name || 'Seleção'}</span>
                      </div>
                      <span className="ticket-card__selection-price">{(sel.price || sel.odds || 0).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="ticket-card__footer">
                  <div className="ticket-card__meta">
                    <div className="ticket-card__meta-item">
                      <span className="ticket-card__meta-label">Apostado</span>
                      <span className="ticket-card__meta-value">{formatBRL(ticket.amount)}</span>
                    </div>
                    <div className="ticket-card__meta-item">
                      <span className="ticket-card__meta-label">Cotação</span>
                      <span className="ticket-card__meta-value">{(ticket.totalOdds || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="ticket-card__return">
                    <span className="ticket-card__return-label">Retorno Potencial</span>
                    <span className="ticket-card__return-value">{formatBRL(ticket.possibleWin)}</span>
                  </div>
                </div>
                
                {ticket.status && ticket.status !== 'PENDING' && (
                  <div className={`ticket-card__status-badge ticket-card__status-badge--${ticket.status.toLowerCase()}`}>
                    {ticket.status === 'WON' ? 'GANHOU' : 'PERDEU'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Compartilhamento (Visual Térmico) */}
      {sharingTicket && (
        <div className="bet-slip-overlay" style={{ zIndex: 2000 }}>
          <div className="bet-slip-backdrop" onClick={() => setSharingTicket(null)} />
          <div className="bet-slip-modal" style={{ maxWidth: '340px' }}>
            <div className="bet-slip__receipt">
              <header className="bet-slip__receipt-header">
                <div className="bet-slip__receipt-success-icon">✓</div>
                <h2 className="bet-slip__receipt-title">Comprovante</h2>
                <p className="bet-slip__receipt-id">Bilhete #{sharingTicket.id}</p>
                <p className="bet-slip__receipt-date">{formatFullDate(sharingTicket.createdAt)}</p>
              </header>

              <div className="bet-slip__receipt-content">
                <div className="bet-slip__receipt-section-title">Seleções</div>
                <ul className="bet-slip__receipt-list">
                  {(sharingTicket.selections || []).map((sel: any, idx: number) => (
                    <li key={idx} className="bet-slip__receipt-item">
                      <div className="bet-slip__receipt-item-match">{sel.homeTeam} vs {sel.awayTeam}</div>
                      <div className="bet-slip__receipt-item-details">
                        <span>{sel.marketName}: <strong>{sel.name}</strong></span>
                        <span className="bet-slip__receipt-item-odd">{(sel.price || sel.odds || 0).toFixed(2)}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="bet-slip__receipt-summary">
                  <div className="bet-slip__receipt-row">
                    <span>Aposta</span>
                    <strong>{formatBRL(sharingTicket.amount)}</strong>
                  </div>
                  <div className="bet-slip__receipt-row">
                    <span>Cotação</span>
                    <strong>{(sharingTicket.totalOdds || 0).toFixed(2)}</strong>
                  </div>
                  <div className="bet-slip__receipt-row bet-slip__receipt-row--total">
                    <span>Retorno</span>
                    <strong>{formatBRL(sharingTicket.possibleWin)}</strong>
                  </div>
                </div>
              </div>

              <footer className="bet-slip__receipt-footer">
                <button type="button" className="bet-slip__receipt-close-btn" onClick={() => setSharingTicket(null)}>
                  Fechar
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
