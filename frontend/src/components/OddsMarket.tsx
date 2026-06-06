import type { OddsMarket } from '../types/odds';
import { OddButton } from './OddButton';

type Props = {
  market: OddsMarket;
};

export function OddsMarketView({ market }: Props) {
  const name = market.name.toLowerCase();
  const isOverUnder = name.includes('mais/') || name.includes('menos') || name.includes('total') || name.includes('over/') || name.includes('under');

  let selections = market.selections;
  if (isOverUnder) {
    // Tenta agrupar por valor (ex: 2.5) e colocar Mais à esquerda e Menos à direita
    // Primeiro, vamos ordenar: Mais antes de Menos
    selections = [...market.selections].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIsMais = aName.includes('mais') || aName.includes('over');
      const bIsMais = bName.includes('mais') || bName.includes('over');
      
      if (aIsMais && !bIsMais) return -1;
      if (!aIsMais && bIsMais) return 1;
      return 0;
    });
  }

  return (
    <section className={`odds-market ${isOverUnder ? 'odds-market--overunder' : ''}`}>
      <h3 className="odds-market__title">{market.name}</h3>
      <div className="odds-market__grid">
        {selections.map((sel) => (
          <OddButton key={`${market.id}::${sel.id}`} selection={sel} />
        ))}
      </div>
    </section>
  );
}
