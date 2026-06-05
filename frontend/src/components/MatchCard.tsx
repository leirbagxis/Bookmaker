import { useNavigate } from 'react-router-dom';
import type { Match } from '../types/match';

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

export function MatchCard({ match }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="match-card"
      onClick={() => navigate(`/event/${match.eventId}`)}
    >
      <div className="match-card__head">
        <span className="match-card__time">{formatTime(match.startTime)}</span>
        {match.status && <span className="match-card__status">{match.status}</span>}
      </div>
      <div className="match-card__teams">
        <span className="match-card__team">{match.homeTeam}</span>
        <span className="match-card__sep">x</span>
        <span className="match-card__team">{match.awayTeam}</span>
      </div>
      <div className="match-card__odds">
        <div className="match-card__odd">
          <span className="match-card__odd-label">1</span>
          <span className="match-card__odd-value">{formatOdd(match.homeOdd)}</span>
        </div>
        <div className="match-card__odd">
          <span className="match-card__odd-label">X</span>
          <span className="match-card__odd-value">{formatOdd(match.drawOdd)}</span>
        </div>
        <div className="match-card__odd">
          <span className="match-card__odd-label">2</span>
          <span className="match-card__odd-value">{formatOdd(match.awayOdd)}</span>
        </div>
      </div>
    </button>
  );
}
