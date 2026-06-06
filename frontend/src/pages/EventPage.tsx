import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { OddsMarketView } from '../components/OddsMarket';
import type { OddsMarket } from '../types/odds';
import type { Match } from '../types/match';

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatOdd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return n.toFixed(2);
}

const CATEGORIES = [
  { id: 'all', label: 'Tudo' },
  { id: 'main', label: 'Principais' },
  { id: 'goals', label: 'Gols' },
  { id: 'overunder', label: 'Mais/Menos' },
  { id: 'handicap', label: 'Handicap' },
  { id: 'corners', label: 'Escanteios' },
  { id: 'cards', label: 'Cartões' },
];

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const { status, send, subscribe } = useWebSocket();
  const [markets, setMarkets] = useState<OddsMarket[] | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (status !== 'open' || !Number.isFinite(id) || id <= 0) return;
    setMarkets(null);
    setError(null);

    const unsub = subscribe((msg) => {
      if (msg.type === 'EVENT_ODDS' && msg.event_id === id) {
        const data = msg.data as { markets?: OddsMarket[]; match?: Match } | OddsMarket[];
        if (Array.isArray(data)) {
          setMarkets(data);
        } else {
          setMarkets(data.markets ?? []);
          if (data.match) setMatch(data.match);
        }
        setError(null);
      } else if (msg.type === 'TODAY_MATCHES') {
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
    return unsub;
  }, [status, id, send, subscribe]);

  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    
    const normalize = (s: string) => 
      s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    if (activeCategory === 'all') return markets;

    return markets.filter((m) => {
      const marketName = normalize(m.name);
      const selectionsText = m.selections.map(s => normalize(s.name)).join(' ');
      const combined = `${marketName} ${selectionsText}`;
      
      switch (activeCategory) {
        case 'main':
          // Principais: Resultado Final, Chance Dupla, Ambas Marcam, Vencedor, 1x2
          return marketName.includes('resultado') || marketName.includes('vencedor') || 
                 marketName.includes('chance') || marketName.includes('ambas') || 
                 marketName.includes('1x2') || marketName.includes('partida') || 
                 marketName.includes('empate') || marketName.includes('vence') || 
                 marketName.includes('draw') || marketName.includes('winner');
        
        case 'goals':
          // Gols: Total de Gols, Placar Exato, Marcar Gols
          return marketName.includes('gol') || marketName.includes('placar') || 
                 marketName.includes('marcar') || marketName.includes('score') ||
                 selectionsText.includes('gol');
        
        case 'overunder':
          // Mais/Menos: Over, Under, Acima, Abaixo, Mais, Menos
          return marketName.includes('mais') || marketName.includes('menos') || 
                 marketName.includes('total') || marketName.includes('over') || 
                 marketName.includes('under') || marketName.includes('acima') || 
                 marketName.includes('abaixo') || selectionsText.includes('mais') || 
                 selectionsText.includes('menos') || selectionsText.includes('acima') || 
                 selectionsText.includes('abaixo');
        
        case 'handicap':
          // Handicap: Asiático, Europeu, Spread
          return marketName.includes('handicap') || marketName.includes('asiatico') || 
                 marketName.includes('spread') || marketName.includes('vantagem');
        
        case 'corners':
          // Escanteios: Cantos, Corners, Tiros de Canto
          return marketName.includes('escanteio') || marketName.includes('canto') || 
                 marketName.includes('corner') || selectionsText.includes('escanteio') || 
                 selectionsText.includes('canto') || selectionsText.includes('corner');
        
        case 'cards':
          // Cartões: Amarelo, Vermelho, Advertência
          return marketName.includes('cartao') || marketName.includes('vermelho') || 
                 marketName.includes('amarelo') || marketName.includes('advertencia') || 
                 marketName.includes('card') || selectionsText.includes('cartao') || 
                 selectionsText.includes('card');
        
        default:
          return false;
      }
    });
  }, [markets, activeCategory]);

  const refresh = () => {
    setError(null);
    setMarkets(null);
    send({ type: 'GET_EVENT_ODDS', event_id: id });
  };

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState message="Identificador de partida inválido." />;
  }

  return (
    <div className="event">
      <Link to="/" className="event__back">← Voltar</Link>

      {match ? (
        <header className="event__head">
          <span className="event__competition">{match.competition || 'Campeonato'}</span>
          <h1 className="event__title">
            {match.homeTeam} <span className="event__sep">x</span> {match.awayTeam}
          </h1>
          <div className="event__meta">
            <span>{formatTime(match.startTime)}</span>
            {match.status && <span className="event__status">{match.status}</span>}
          </div>
          <div className="event__main-odds">
            <div className="event__odd">
              <span>1</span>
              <strong>{formatOdd(match.homeOdd)}</strong>
            </div>
            <div className="event__odd">
              <span>X</span>
              <strong>{formatOdd(match.drawOdd)}</strong>
            </div>
            <div className="event__odd">
              <span>2</span>
              <strong>{formatOdd(match.awayOdd)}</strong>
            </div>
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
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((m) => (
                <OddsMarketView key={m.id} market={m} />
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
