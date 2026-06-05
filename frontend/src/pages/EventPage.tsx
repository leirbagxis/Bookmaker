import { useEffect, useState } from 'react';
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

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const { status, send, subscribe } = useWebSocket();
  const [markets, setMarkets] = useState<OddsMarket[] | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            {markets.map((m) => (
              <OddsMarketView key={m.id} market={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
