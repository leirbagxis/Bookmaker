import { useNavigate } from 'react-router-dom';
import type { Match } from '../types/match';
import type { OddSelection } from '../types/odds';
import { LiveBadge } from './LiveBadge';
import { OddButton } from './OddButton';

type Props = {
  match: Match;
};

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function MatchCard({ match }: Props) {
  const navigate = useNavigate();
  const isLive = match.status === 'LIVE';
  const showScore =
    isLive && typeof match.homeScore === 'number' && typeof match.awayScore === 'number';

  const createSelection = (name: string, price: number, id: string): OddSelection => ({
    id,
    eventId: match.eventId,
    marketId: '1x2',
    marketName: 'Resultado Final',
    name,
    price,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
  });

  return (
    <div className={`match-card${isLive ? ' match-card--live' : ''}`}>
      <div className="match-card__link" onClick={() => navigate(`/event/${match.eventId}`)}>
        <div className="match-card__head">
          <span className="match-card__time">{formatTime(match.startTime)}</span>
          {isLive && <LiveBadge liveMinute={match.liveMinute} clock={match.clock} />}
        </div>
        <div className="match-card__teams">
          <span className="match-card__team">
            {match.homeTeam}
            {showScore && <strong className="match-card__score">{match.homeScore}</strong>}
          </span>
          <span className="match-card__sep">x</span>
          <span className="match-card__team">
            {match.awayTeam}
            {showScore && <strong className="match-card__score">{match.awayScore}</strong>}
          </span>
        </div>
      </div>
      <div className="match-card__odds">
        <OddButton compact selection={createSelection('1', match.homeOdd, 'h')} />
        <OddButton compact selection={createSelection('X', match.drawOdd, 'd')} />
        <OddButton compact selection={createSelection('2', match.awayOdd, 'a')} />
      </div>
    </div>
  );
}
