import type { CompetitionGroup } from '../types/match';
import { MatchCard } from './MatchCard';

type Props = {
  group: CompetitionGroup;
};

export function CompetitionSection({ group }: Props) {
  const liveCount = group.matches.filter((m) => m.status === 'LIVE').length;
  return (
    <section className="competition-section">
      <header className="competition-section__head">
        <h2 className="competition-section__title">{group.name}</h2>
        <span className="competition-section__count">
          {liveCount > 0 && (
            <span className="competition-section__live" aria-label={`${liveCount} jogos ao vivo`}>
              {liveCount} ao vivo
            </span>
          )}
          {group.matches.length} {group.matches.length === 1 ? 'jogo' : 'jogos'}
        </span>
      </header>
      <div className="competition-section__list">
        {group.matches.map((m) => (
          <MatchCard key={m.eventId} match={m} />
        ))}
      </div>
    </section>
  );
}
