import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { OddsMarketView, OddsMarketsGrouped } from '../components/OddsMarket';
import { LiveBadge } from '../components/LiveBadge';
import { LastUpdated } from '../components/LastUpdated';
import type { OddsMarket } from '../types/odds';
import type { Match } from '../types/match';

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const CATEGORIES = [
  { id: 'main', label: 'Principais' },
  { id: 'goals', label: 'Gols' },
  { id: 'corners', label: 'Escanteios' },
  { id: 'cards', label: 'Cartões' },
  { id: 'stats', label: 'Estatísticas' },
];

const normalize = (s: string) =>
  s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

function getMarketCategories(marketName: string): string[] {
  const n = normalize(marketName);
  const cats: string[] = [];

  // 1. REJEIÇÃO DE COMBINADAS (Bet Builder / Combinadas Prontas)
  if (marketName.includes(';') || marketName.includes(' + ')) return [];

  // 2. PRIORIDADE: Escanteios (Corners)
  if (n.includes('escanteio') || n.includes('canto') || n.includes('corner')) {
    cats.push('corners');
    return cats;
  }

  // 3. PRIORIDADE: Cartões (Cards)
  if (n.includes('cartao') || n.includes('cartoe') || n.includes('card') || n.includes('punicao') || n.includes('advertencia') || n.includes('amarelo') || n.includes('vermelho')) {
    cats.push('cards');
    if (n.includes('total') && !n.includes('equipe') && !n.includes('1 tempo')) {
      cats.push('main');
    }
    return cats;
  }

  // 4. Gols (Goals)
  const isGoals =
    n.includes('total de gols') || n.includes('mais/menos gols') || n.includes('over/under goals') ||
    n.includes('gols totais') || n.includes('gol') || n.includes('marcar gol') ||
    n.includes('gols') || n.includes('ambas') || n.includes('resultado final & total') ||
    n.includes('dupla chance & total') || n.includes('total & ambas') ||
    n.includes('Resultado Final ou Total de Gols') ||
    n.includes('faixa de gols') || n.includes('handicap asiatico') || n.includes('total de gols asiatico') ||
    n.includes('impar') || n.includes('par') ||
    n.includes('vencer') || n.includes('intervalo/resultado') ||
    n.includes('resultado do intervalo') || n.includes('resultado em qualquer') ||
    n.includes('resultado correto') || n.includes('maior numero de gols');

  if (isGoals) cats.push('goals');

  // 5. Estatísticas
  if (n.includes('chute') || n.includes('finalizacao') || n.includes('finalização') || n.includes('falta') || n.includes('remate')) {
    cats.push('stats');
  }

  // 6. Principais (Outros)
  const isOtherMain =
    n === 'resultado final' || n === '1x2' || n === 'vencedor do encontro' || n === 'resultado' ||
    n.includes('dupla chance') || n.includes('double chance') ||
    n.includes('ambas marcam') || n.includes('ambas as equipes marcam') ||
    n.includes('empate anula') || n.includes('draw no bet') ||
    n.includes('ambas as equipes marcam ou mais de 2.5');

  if (isOtherMain) cats.push('main');

  // 7. Fallback: se não encaixou em nenhuma, coloca em 'goals' por padrão
  if (cats.length === 0) cats.push('goals');

  return cats;
}

function marketMatchesCategory(market: OddsMarket, category: string): boolean {
  return getMarketCategories(market.name).includes(category);
}

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const { status, send, subscribe } = useWebSocket();
  const [markets, setMarkets] = useState<OddsMarket[] | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('main');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'open' || !Number.isFinite(id) || id <= 0) return;
    setMarkets(null);
    setError(null);

    const unsub = subscribe((msg) => {
      if ((msg.type === 'EVENT_ODDS' || msg.type === 'ODDS_UPDATED') && msg.event_id === id) {
        const data = msg.data as { markets?: OddsMarket[]; match?: Match } | OddsMarket[];
        let rawMarkets: OddsMarket[] = [];
        if (Array.isArray(data)) {
          rawMarkets = data;
        } else {
          rawMarkets = data.markets ?? [];
          if (data.match) setMatch(data.match);
        }
        setMarkets(rawMarkets);
        setError(null);
        setLastUpdated(Date.now());
      } else if (msg.type === 'TODAY_MATCHES' || msg.type === 'MATCHES_UPDATED') {
        const groups = msg.data as Array<{ matches: Match[] }>;
        for (const g of groups) {
          const found = g.matches.find((m) => m.eventId === id);
          if (found) {
            setMatch(found);
            break;
          }
        }
      } else if (msg.type === 'ERROR') {
        setError(msg.message);
      }
    });

    send({ type: 'GET_TODAY_MATCHES' });
    send({ type: 'GET_EVENT_ODDS', event_id: id });
    return () => {
      unsub();
      send({ type: 'UNSUBSCRIBE_EVENT', event_id: id });
    };
  }, [status, id, send, subscribe]);

  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    
    // Log para depuração (opcional, remover se não quiser poluir o console)
    // console.log('DEBUG: Filtrando mercados:', markets.length, activeCategory);

    // Primeiro filtro: apenas mercados que pertencem a pelo menos uma categoria permitida
    const basicMarkets = markets.filter((m) => 
      CATEGORIES.some(cat => marketMatchesCategory(m, cat.id))
    );
    // Segundo filtro: categoria ativa
    return basicMarkets.filter((m) => marketMatchesCategory(m, activeCategory));
  }, [markets, activeCategory]);

  const refresh = () => {
    setError(null);
    setMarkets(null);
    send({ type: 'GET_EVENT_ODDS', event_id: id });
  };

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState message="Identificador de partida inválido." />;
  }

  const isLive = match?.status === 'LIVE';
  const showScore =
    isLive && typeof match?.homeScore === 'number' && typeof match?.awayScore === 'number';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <Link to="/" className="text-muted font-bold text-xs uppercase tracking-widest hover:text-accent flex items-center gap-1 w-fit">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Voltar
      </Link>

      {match ? (
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-muted bg-surface px-2 py-1 rounded-sm uppercase tracking-widest">{match.competition || 'Campeonato'}</span>
            {isLive && <LiveBadge liveMinute={match.liveMinute} clock={match.clock} size="md" />}
            {lastUpdated && <LastUpdated timestamp={lastUpdated} label="Odds" />}
          </div>
          <h1 className="font-black uppercase tracking-tight text-xl leading-tight flex items-center gap-2 flex-wrap">
            <span>{match.homeTeam}</span>
            {showScore && <strong className="text-primary bg-accent px-2 py-0.5 rounded-md">{match.homeScore}</strong>}
            <span className="text-muted mx-1">x</span>
            <span>{match.awayTeam}</span>
            {showScore && <strong className="text-primary bg-accent px-2 py-0.5 rounded-md">{match.awayScore}</strong>}
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold text-muted mt-1">
            <span>{formatTime(match.startTime)}</span>
            {match.status && !isLive && <span className="bg-primary text-black px-2 py-0.5 rounded-sm uppercase tracking-widest text-[9px]">{match.status}</span>}
          </div>
        </header>
      ) : (
        <LoadingState label="Carregando jogo..." />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`px-5 py-2 rounded-full font-black uppercase text-xs tracking-widest whitespace-nowrap transition-all shadow-sm ${
                activeCategory === cat.id ? 'bg-accent text-white' : 'bg-panel text-muted hover:bg-border'
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4" key={activeCategory}>
          {error && <ErrorState message={error} onRetry={refresh} />}
          {!error && markets === null && <LoadingState label="Carregando odds..." />}
          {!error && markets && markets.length === 0 && (
            <EmptyState
              title="Este jogo não possui odds disponíveis."
              description="Tente outro jogo."
            />
          )}
          {!error && markets && markets.length > 0 && (
            <div className="flex flex-col animate-fade-in">
              {activeCategory === 'all' ? (
                filteredMarkets.length > 0 ? (
                  <OddsMarketsGrouped 
                    markets={filteredMarkets} 
                    homeTeam={match?.homeTeam} 
                    awayTeam={match?.awayTeam} 
                    startTime={match?.startTime}
                  />
                ) : (
                  <EmptyState
                    title="Nenhum mercado disponível"
                    description="Tente selecionar outra aba."
                  />
                )
              ) : filteredMarkets.length > 0 ? (
                filteredMarkets.map((m) => (
                  <OddsMarketView 
                    key={`${m.id}-${m.name}`} 
                    market={m} 
                    homeTeam={match?.homeTeam} 
                    awayTeam={match?.awayTeam} 
                    startTime={match?.startTime}
                  />
                ))
              ) : (
                <EmptyState
                  title="Nenhum mercado nesta categoria"
                  description="Tente selecionar outra aba."
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
