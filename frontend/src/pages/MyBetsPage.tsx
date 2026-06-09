import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

type Tab = 'pending' | 'won' | 'lost';
type MatchScore = { homeScore: number; awayScore: number };

function normalize(s: string): string {
  return s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
}

function isSelectionWinning(sel: any, score: MatchScore | undefined): boolean | null {
  if (!score) return null;
  const totalGoals = score.homeScore + score.awayScore;
  const marketName = normalize(sel.marketName || '');
  const selName = normalize(sel.name || '');

  // Over/Under de gols
  if (marketName.includes('total de gols') || marketName.includes('mais/menos') || marketName.includes('over/under')) {
    const match = selName.match(/(\d+\.?\d*)/);
    if (match) {
      const line = parseFloat(match[1]);
      if (selName.includes('mais') || selName.includes('over')) {
        return totalGoals > line;
      }
      if (selName.includes('menos') || selName.includes('under')) {
        return totalGoals < line;
      }
    }
  }

  // Resultado Final 1X2
  if (marketName === 'resultado final' || marketName === '1x2') {
    if (selName === '1' || selName === normalize(score.homeScore > score.awayScore ? (sel as any).homeTeam || '' : '_')) {
      return score.homeScore > score.awayScore;
    }
    if (selName === 'x') {
      return score.homeScore === score.awayScore;
    }
    if (selName === '2') {
      return score.awayScore > score.homeScore;
    }
  }

  // Ambas marcam
  if (marketName.includes('ambas')) {
    const bothScored = score.homeScore > 0 && score.awayScore > 0;
    if (selName === 'sim') return bothScored;
    if (selName === 'nao') return !bothScored;
  }

  return null;
}

export function MyBetsPage() {
  const userContext = useUser();
  const { user, tickets = [], isLoading, isTicketsLoading, fetchTickets } = userContext || {};
  const { subscribe } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [sharingTicket, setSharingTicket] = useState<any>(null);
  const [liveScores, setLiveScores] = useState<Map<number, MatchScore>>(new Map());

  // Buscar placares ao vivo dos jogos nos bilhetes pendentes
  useEffect(() => {
    const eventIds = new Set<number>();
    const list = Array.isArray(tickets) ? tickets : [];
    for (const t of list) {
      if (t?.status === 'PENDING' && t.selections) {
        for (const sel of t.selections) {
          if (sel.eventId) eventIds.add(sel.eventId);
        }
      }
    }
    if (eventIds.size === 0) return;

    const unsub = subscribe((msg) => {
      if (msg.type === 'TODAY_MATCHES' || msg.type === 'MATCHES_UPDATED') {
        const groups = msg.data as Array<{ matches: Array<any> }>;
        setLiveScores(prev => {
          const next = new Map(prev);
          for (const g of groups) {
            for (const m of g.matches) {
              if (eventIds.has(m.eventId) && m.homeScore != null && m.awayScore != null) {
                next.set(m.eventId, { homeScore: m.homeScore, awayScore: m.awayScore });
              }
            }
          }
          return next;
        });
      }
    });

    return unsub;
  }, [tickets, subscribe]);

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

  const ticketCounts = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    return {
      pending: list.filter(t => t?.status === 'PENDING').length,
      won: list.filter(t => t?.status === 'WON').length,
      lost: list.filter(t => t?.status === 'LOST').length,
    };
  }, [tickets]);

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
    <div className="flex flex-col gap-4 animate-fade-in">
      <header className="flex flex-col gap-3 mb-2">
        <h1 className="font-black uppercase tracking-tight text-2xl">Meus Bilhetes</h1>
        <div className="flex bg-panel p-1 rounded-xl gap-1 shadow-sm">
          <button 
            className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-accent text-white shadow-md' : 'text-muted hover:text-accent'}`}
            onClick={() => setActiveTab('pending')}
          >
            Abertas {ticketCounts.pending > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{ticketCounts.pending}</span>}
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'won' ? 'bg-accent text-white shadow-md' : 'text-muted hover:text-accent'}`}
            onClick={() => setActiveTab('won')}
          >
            Ganhas {ticketCounts.won > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{ticketCounts.won}</span>}
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'lost' ? 'bg-accent text-white shadow-md' : 'text-muted hover:text-accent'}`}
            onClick={() => setActiveTab('lost')}
          >
            Perdidas {ticketCounts.lost > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{ticketCounts.lost}</span>}
          </button>
        </div>
      </header>

      <div className="flex flex-col">
        {isTicketsLoading && (!tickets || tickets.length === 0) ? (
          <LoadingState label="Carregando bilhetes..." />
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center">
            <EmptyState 
              title={activeTab === 'pending' ? "Nenhuma aposta aberta" : "Nenhum bilhete encontrado"}
              description="Suas apostas aparecerão aqui assim que você confirmá-las no bilhete."
            />
            {user && (
              <button 
                onClick={() => fetchTickets && fetchTickets()} 
                className="mt-6 bg-panel border border-border text-primary font-black uppercase text-xs tracking-widest py-2 px-6 rounded-full hover:bg-border transition-colors"
              >
                Atualizar Histórico
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredTickets.map((ticket, tIdx) => (
              <div key={ticket.id || tIdx} className={`refined-card !p-4 flex flex-col gap-4 border-l-4 ${ticket.status === 'WON' ? 'border-success' : ticket.status === 'LOST' ? 'border-error' : 'border-warning'}`}>
                <div className="flex justify-between items-start border-b-2 border-dashed border-border pb-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-primary bg-accent px-2 py-0.5 rounded-sm">{ticket.externalId || ticket.id || '---'}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                        ticket.status === 'WON' ? 'bg-success/20 text-success' : 
                        ticket.status === 'LOST' ? 'bg-error/20 text-error' : 
                        'bg-warning/20 text-warning'
                      }`}>
                        {ticket.status === 'WON' ? (
                          <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>GANHOU</>
                        ) : ticket.status === 'LOST' ? (
                          <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>PERDEU</>
                        ) : (
                          <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/></svg>ABERTA</>
                        )}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted mt-1">{formatFullDate(ticket.createdAt)}</span>
                  </div>
                  <button 
                    className="flex items-center gap-1 bg-surface border border-border px-2 py-1 rounded-md text-[10px] font-bold text-muted hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                    onClick={() => setSharingTicket(ticket)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    <span>Compartilhar</span>
                  </button>
                </div>
                
                <ul className="flex flex-col gap-2">
                  {(ticket.selections || []).map((sel: any, sIdx: number) => {
                    const selStatus = (sel.status || '').toUpperCase();
                    const isLost = selStatus === 'LOST';
                    const isWon = selStatus === 'WON';
                    const score = liveScores.get(sel.eventId);
                    const isWinning = !isLost && !isWon && isSelectionWinning(sel, score);
                    const hasScore = score != null || (sel.homeScore != null && sel.awayScore != null);
                    const displayHome = score?.homeScore ?? sel.homeScore;
                    const displayAway = score?.awayScore ?? sel.awayScore;
                    return (
                      <li key={sIdx} className={`flex justify-between items-start border-b border-dotted border-border pb-2 last:border-0 last:pb-0 ${isLost ? 'opacity-50' : ''}`}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-accent">{sel.homeTeam || 'Time'} vs {sel.awayTeam || 'Time'}</span>
                            {hasScore && displayHome != null && displayAway != null && (
                              <span className="text-[10px] font-black bg-surface px-1.5 py-0.5 rounded text-muted">{displayHome} x {displayAway}</span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-muted mb-1">{formatFullDate(sel.startTime)}</div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted">{sel.marketName || 'Mercado'}</span>
                          <div className="flex items-center gap-1.5">
                            {isWinning === true && (
                              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            )}
                            <span className={`text-xs font-bold ${isLost ? 'text-error line-through' : isWon ? 'text-success' : isWinning === true ? 'text-success' : 'text-accent'}`}>
                              {isLost && <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                              {isWon && <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                              {sel.name || 'Seleção'}
                            </span>
                          </div>
                        </div>
                        <span className={`text-sm font-black ${isLost ? 'text-error line-through' : isWon ? 'text-success' : isWinning === true ? 'text-success' : 'text-primary bg-accent px-1.5 py-0.5 rounded-md'}`}>{(sel.price || sel.odds || 0).toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="bg-surface -mx-4 -mb-4 p-4 flex justify-between items-end border-t border-border mt-2">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Apostado</span>
                      <span className="text-xs font-black">{formatBRL(ticket.amount)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted">Cotação</span>
                      <span className="text-xs font-black">{(ticket.totalOdds || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      {ticket.status === 'WON' ? 'Ganho' : ticket.status === 'LOST' ? 'Perda' : 'Retorno Potencial'}
                    </span>
                    <span className={`text-base font-black px-2 py-0.5 rounded-md ${
                      ticket.status === 'WON' ? 'text-success bg-success/10' : 
                      ticket.status === 'LOST' ? 'text-error bg-error/10 line-through' : 
                      'text-primary bg-accent'
                    }`}>{formatBRL(ticket.status === 'LOST' ? ticket.amount : ticket.possibleWin)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Compartilhamento (Efeito Papel Rasgado) */}
      {sharingTicket && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setSharingTicket(null)} />
          <div className="relative w-full max-w-[340px] animate-slide-up" style={{ transform: 'rotate(-1deg)' }}>
            <div className="relative shadow-[0_8px_32px_rgba(0,0,0,0.3)]" style={{ 
              background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #faf8f5 100%)',
              backgroundImage: `
                linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #faf8f5 100%),
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")
              `,
              padding: '24px 20px',
              clipPath: 'polygon(0% 3%, 2% 0%, 5% 2%, 8% 0%, 11% 1%, 14% 0%, 17% 2%, 20% 0%, 23% 1%, 26% 0%, 29% 2%, 32% 0%, 35% 1%, 38% 0%, 41% 2%, 44% 0%, 47% 1%, 50% 0%, 53% 2%, 56% 0%, 59% 1%, 62% 0%, 65% 2%, 68% 0%, 71% 1%, 74% 0%, 77% 2%, 80% 0%, 83% 1%, 86% 0%, 89% 2%, 92% 0%, 95% 1%, 98% 0%, 100% 2%, 100% 97%, 98% 100%, 95% 98%, 92% 100%, 89% 99%, 86% 100%, 83% 98%, 80% 100%, 77% 99%, 74% 100%, 71% 98%, 68% 100%, 65% 99%, 62% 100%, 59% 98%, 56% 100%, 53% 99%, 50% 100%, 47% 98%, 44% 100%, 41% 99%, 38% 100%, 35% 98%, 32% 100%, 29% 99%, 26% 100%, 23% 98%, 20% 100%, 17% 99%, 14% 100%, 11% 98%, 8% 100%, 5% 99%, 2% 100%, 0% 97%)'
            }}>
              <div className="flex flex-col gap-4">
              <header className="flex flex-col items-center gap-1 border-b-2 border-dashed border-gray-300 pb-4 text-center">
                <div className={`w-10 h-10 ${sharingTicket.status === 'WON' ? 'bg-success' : sharingTicket.status === 'LOST' ? 'bg-error' : 'bg-warning'} text-white rounded-full flex items-center justify-center font-bold mb-1`}>
                  {sharingTicket.status === 'WON' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : sharingTicket.status === 'LOST' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                  )}
                </div>
                <h2 className="font-mono text-base font-black uppercase m-0">Comprovante</h2>
                <p className="font-mono text-sm font-bold text-gray-800 m-0">Bilhete #{sharingTicket.externalId || sharingTicket.id}</p>
                <p className={`font-mono text-xs font-black uppercase m-0 ${
                  sharingTicket.status === 'WON' ? 'text-success' : sharingTicket.status === 'LOST' ? 'text-error' : 'text-warning'
                }`}>
                  {sharingTicket.status === 'WON' ? '✓ GANHOU' : sharingTicket.status === 'LOST' ? '✕ PERDEU' : '⏳ AGUARDANDO'}
                </p>
                <p className="font-mono text-[10px] text-gray-500 m-0">{formatFullDate(sharingTicket.createdAt)}</p>
              </header>

              <div className="py-2">
                <div className="font-mono text-[10px] uppercase font-bold text-gray-600 mb-2 border-b border-gray-100 pb-1">Seleções</div>
                <ul className="flex flex-col gap-2">
                  {(sharingTicket.selections || []).map((sel: any, idx: number) => {
                    const selStatus = (sel.status || '').toUpperCase();
                    const isLost = selStatus === 'LOST';
                    const isWon = selStatus === 'WON';
                    const score = liveScores.get(sel.eventId);
                    const isWinning = !isLost && !isWon && isSelectionWinning(sel, score);
                    const displayHome = score?.homeScore ?? sel.homeScore;
                    const displayAway = score?.awayScore ?? sel.awayScore;
                    return (
                      <li key={idx} className={`flex flex-col gap-0.5 border-b border-dotted border-gray-200 pb-2 ${isLost ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase">{sel.homeTeam} vs {sel.awayTeam}</span>
                          {displayHome != null && displayAway != null && (
                            <span className="text-[10px] font-black bg-gray-100 px-1 py-0.5 rounded">{displayHome} x {displayAway}</span>
                          )}
                          {isWinning === true && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        </div>
                        <div className="font-mono text-[9px] text-gray-500 mb-1">{formatFullDate(sel.startTime)}</div>
                        <div className="flex justify-between items-center text-[10px] text-gray-800">
                          <span className={isLost ? 'line-through' : isWon || isWinning === true ? 'text-green-700 font-bold' : ''}>
                            {isLost && '✕ '}
                            {isWon && '✓ '}
                            {sel.marketName}: <strong>{sel.name}</strong>
                          </span>
                          <span className={`font-black ${isLost ? 'line-through text-gray-400' : 'text-black'}`}>{(sel.price || sel.odds || 0).toFixed(2)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t-2 border-black pt-2 mt-2 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span>Aposta</span>
                    <strong>{formatBRL(sharingTicket.amount)}</strong>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span>Cotação</span>
                    <strong>{(sharingTicket.totalOdds || 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-black pt-1 mt-1 font-mono">
                    <span>{sharingTicket.status === 'LOST' ? 'Perda' : 'Retorno'}</span>
                    <strong>{formatBRL(sharingTicket.status === 'LOST' ? sharingTicket.amount : sharingTicket.possibleWin)}</strong>
                  </div>
                </div>
              </div>
              </div>

              <footer className="mt-2">
                <button type="button" className="w-full bg-accent text-white font-bold uppercase py-2 rounded-md hover:bg-black transition-colors text-xs" onClick={() => setSharingTicket(null)}>
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
