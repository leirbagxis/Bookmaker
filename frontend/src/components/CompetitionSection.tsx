import type { CompetitionGroup } from '../types/match';
import { MatchCard } from './MatchCard';

type Props = {
  group: CompetitionGroup;
};

export function CompetitionSection({ group }: Props) {
  const liveCount = group.matches.filter((m) => m.status === 'LIVE').length;
  return (
    <section className="flex flex-col gap-3">
      <header className="flex justify-between items-end pb-2 border-b-2 border-border border-dashed">
        <h2 className="font-black uppercase tracking-tight text-sm text-accent leading-tight">{group.name}</h2>
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
          {liveCount > 0 && (
            <span className="text-black bg-primary px-2 py-0.5 rounded-sm uppercase tracking-widest text-[9px]" aria-label={`${liveCount} jogos ao vivo`}>
              {liveCount} ao vivo
            </span>
          )}
          <span>{group.matches.length} {group.matches.length === 1 ? 'jogo' : 'jogos'}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.matches.map((m) => (
          <MatchCard key={m.eventId} match={m} />
        ))}
      </div>
    </section>
  );
}
