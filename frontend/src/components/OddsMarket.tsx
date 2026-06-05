import type { OddsMarket } from '../types/odds';
import { OddButton } from './OddButton';

type Props = {
  market: OddsMarket;
};

export function OddsMarketView({ market }: Props) {
  return (
    <section className="odds-market">
      <h3 className="odds-market__title">{market.name}</h3>
      <div className="odds-market__grid">
        {market.selections.map((sel) => (
          <OddButton key={`${market.id}::${sel.id}`} selection={sel} />
        ))}
      </div>
    </section>
  );
}
