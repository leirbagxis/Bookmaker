import { useNavigate } from 'react-router-dom';
import type { Match } from '../types/match';
import { useOddChange } from '../hooks/useOddChange';
import { LiveBadge } from './LiveBadge';

type Props = {
  match: Match;
};

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatOdd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '-';
  return n.toFixed(2);
}

function ChangeArrow({ change }: { change: 'up' | 'down' | 'same' }) {
  if (change === 'same') return null;
  return (
    <span className={`match-card__arrow match-card__arrow--${change}`} aria-hidden="true">
      {change === 'up' ? '▲' : '▼'}
    </span>
  );
}

function OddCell({ value, change, flash }: { value: number; change: 'up' | 'down' | 'same'; flash: boolean }) {
  return (
    <div className={`match-card__odd${flash ? ` match-card__odd--flash-${change}` : ''}`}>
      <span className="match-card__odd-label">1</span>
      <span className="match-card__odd-value">
        {formatOdd(value)}
        <ChangeArrow change={change} />
      </span>
    </div>
  );
}

function XCell({ value, change, flash }: { value: number; change: 'up' | 'down' | 'same'; flash: boolean }) {
  return (
    <div className={`match-card__odd${flash ? ` match-card__odd--flash-${change}` : ''}`}>
      <span className="match-card__odd-label">X</span>
      <span className="match-card__odd-value">
        {formatOdd(value)}
        <ChangeArrow change={change} />
      </span>
    </div>
  );
}

function AwayCell({ value, change, flash }: { value: number; change: 'up' | 'down' | 'same'; flash: boolean }) {
  return (
    <div className={`match-card__odd${flash ? ` match-card__odd--flash-${change}` : ''}`}>
      <span className="match-card__odd-label">2</span>
      <span className="match-card__odd-value">
        {formatOdd(value)}
        <ChangeArrow change={change} />
      </span>
    </div>
  );
}

export function MatchCard({ match }: Props) {
  const navigate = useNavigate();
  const isLive = match.status === 'LIVE';
  const showScore =
    isLive && typeof match.homeScore === 'number' && typeof match.awayScore === 'number';

  const homeOdd = useOddChange(match.homeOdd, `${match.eventId}::h`);
  const drawOdd = useOddChange(match.drawOdd, `${match.eventId}::d`);
  const awayOdd = useOddChange(match.awayOdd, `${match.eventId}::a`);

  return (
    <button
      type="button"
      className={`match-card${isLive ? ' match-card--live' : ''}`}
      onClick={() => navigate(`/event/${match.eventId}`)}
    >
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
      <div className="match-card__odds">
        <OddCell value={match.homeOdd} change={homeOdd.change} flash={homeOdd.flash} />
        <XCell value={match.drawOdd} change={drawOdd.change} flash={drawOdd.flash} />
        <AwayCell value={match.awayOdd} change={awayOdd.change} flash={awayOdd.flash} />
      </div>
    </button>
  );
}
