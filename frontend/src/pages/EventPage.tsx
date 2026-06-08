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
  // A Superbet usa ";" para separar os eventos de uma combinada pronta.
  if (marketName.includes(';') || marketName.includes(' + ')) return [];

  // 2. LÓGICA DE CARTÕES
  if (n.includes('cartao') || n.includes('cartoe') || n.includes('card') || n.includes('punicao') || n.includes('advertencia')) {
    cats.push('cards');
    // Apenas o "Total de Cartões" da partida vai para a aba principal
    if (n.includes('total') && !n.includes('1 tempo') && !n.includes('1t') && !n.includes('equipe')) {
      cats.push('main');
    }
  }

  // 3. RESTANTE DAS CATEGORIAS
  
  // Principais (Outros)
  const isOtherMain = 
    n === 'resultado final' || n === '1x2' || n === 'vencedor do encontro' || n === 'resultado' ||
    n.includes('dupla chance') || n.includes('double chance') ||
    n.includes('ambas marcam') || n.includes('ambas as equipes marcam') ||
    n.includes('empate anula') || n.includes('draw no bet') ||
    n.includes('ambas as equipes marcam ou mais de 2.5');
  
  if (isOtherMain) cats.push('main');

  // Gols
  if (
    n.includes('total de gols') || n.includes('mais/menos gols') || n.includes('over/under goals') ||
    n.includes('1 gol') || n.includes('primeiro gol') || n.includes('1st goal')
  ) {
    cats.push('goals');
  }

  // Escanteios
  if (n.includes('escanteio') || n.includes('canto') || n.includes('corner')) {
    if (n.includes('total') || n.includes('mais/menos') || n.includes('over/under') || n.includes('faixa')) {
      cats.push('corners');
    }
  }

  // Estatísticas
  if (n.includes('chute') || n.includes('finalizacao') || n.includes('finalização') || n.includes('falta') || n.includes('remate')) {
    cats.push('stats');
  }

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
    <div className="event">
      <Link to="/" className="event__back">← Voltar</Link>

      {match ? (
        <header className="event__head">
          <div className="event__head-top">
            <span className="event__competition">{match.competition || 'Campeonato'}</span>
            {isLive && <LiveBadge liveMinute={match.liveMinute} clock={match.clock} size="md" />}
            {lastUpdated && <LastUpdated timestamp={lastUpdated} label="Odds" />}
          </div>
          <h1 className="event__title">
            {match.homeTeam}{' '}
            {showScore && <strong className="event__score">{match.homeScore}</strong>}
            <span className="event__sep">x</span>
            {match.awayTeam}{' '}
            {showScore && <strong className="event__score">{match.awayScore}</strong>}
          </h1>
          <div className="event__meta">
            <span>{formatTime(match.startTime)}</span>
            {match.status && !isLive && <span className="event__status">{match.status}</span>}
          </div>
        </header>
      ) : (
        <LoadingState label="Carregando jogo..." />
      )}

      <div className="event__tabs-container">
        <div className="event__tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`event__tab ${activeCategory === cat.id ? 'event__tab--active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="event__content">
        {error && <ErrorState message={error} onRetry={refresh} />}
        {!error && markets === null && <LoadingState label="Carregando odds..." />}
        {!error && markets && markets.length === 0 && (
          <EmptyState
            title="Este jogo não possui odds disponíveis."
            description="Tente outro jogo."
          />
        )}
        {!error && markets && markets.length > 0 && (
          <div className="event__markets">
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
                  key={m.id} 
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
  );
}
