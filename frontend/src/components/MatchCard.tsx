import { useNavigate } from 'react-router-dom';
import type { Match } from '../types/match';
import type { OddSelection } from '../types/odds';
import { LiveBadge } from './LiveBadge';
import { OddButton } from './OddButton';

type Props = {
  match: Match;
};

function formatDisplayDate(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const now = new Date();
  const isToday = d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) {
    return `Hoje, ${timeStr}`;
  }
  
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dateStr}, ${timeStr}`;
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
    startTime: match.startTime,
  });

  return (
    <div className={`refined-card !p-3 flex flex-col gap-3 cursor-pointer group ${isLive ? 'border-l-4 border-primary' : ''}`} onClick={() => navigate(`/event/${match.eventId}`)}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black uppercase bg-surface px-2 py-1 rounded-md text-muted whitespace-nowrap">
          {formatDisplayDate(match.startTime)}
        </span>
        {isLive && <LiveBadge liveMinute={match.liveMinute} clock={match.clock} />}
      </div>
      
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-sm font-black text-accent uppercase tracking-tight">
          <span className="truncate">{match.homeTeam}</span>
          {showScore && <strong className="text-primary bg-accent px-2 py-0.5 rounded-md">{match.homeScore}</strong>}
        </div>
        <div className="flex justify-between items-center text-sm font-black text-accent uppercase tracking-tight">
          <span className="truncate">{match.awayTeam}</span>
          {showScore && <strong className="text-primary bg-accent px-2 py-0.5 rounded-md">{match.awayScore}</strong>}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-1 mt-2" onClick={e => e.stopPropagation()}>
        <OddButton compact selection={createSelection('1', match.homeOdd, 'h')} />
        <OddButton compact selection={createSelection('X', match.drawOdd, 'd')} />
        <OddButton compact selection={createSelection('2', match.awayOdd, 'a')} />
      </div>
    </div>
  );
}
