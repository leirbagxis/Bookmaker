import type { CompetitionGroup } from '../types/match';
import { MatchCard } from './MatchCard';

type Props = {
  group: CompetitionGroup;
};

export function CompetitionSection({ group }: Props) {
  return (
    <section className="competition-section">
      <header className="competition-section__head">
        <h2 className="competition-section__title">{group.name}</h2>
        <span className="competition-section__count">{group.matches.length} jogos</span>
      </header>
      <div className="competition-section__list">
        {group.matches.map((m) => (
          <MatchCard key={m.eventId} match={m} />
        ))}
      </div>
    </section>
  );
}
