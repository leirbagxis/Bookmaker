import type { OddsMarket } from '../types/odds';
import { OddButton } from './OddButton';

type Props = {
  market: OddsMarket;
};

type Period = '1H' | '2H' | 'FULL';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function detectPeriod(name: string): Period {
  const n = normalize(name);
  if (
    n.includes('1 tempo') ||
    n.includes('1t') ||
    n.includes('first half') ||
    n.includes('ht ') ||
    n.startsWith('ht ') ||
    n === 'ht' ||
    n.includes('intervalo')
  ) {
    return '1H';
  }
  if (
    n.includes('2 tempo') ||
    n.includes('2t') ||
    n.includes('second half')
  ) {
    return '2H';
  }
  return 'FULL';
}

function isOverUnder(name: string): boolean {
  const n = normalize(name);
  return (
    n.includes('mais/') ||
    n.includes('menos') ||
    n.includes('total') ||
    n.includes('over/') ||
    n.includes('under') ||
    n.includes('mais de') ||
    n.includes('menos de')
  );
}

function orderSelections(market: OddsMarket) {
  if (!isOverUnder(market.name)) return market.selections;
  return [...market.selections].sort((a, b) => {
    const aN = normalize(a.name);
    const bN = normalize(b.name);
    const aOver = aN.includes('mais') || aN.includes('over');
    const bOver = bN.includes('mais') || bN.includes('over');
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return 0;
  });
}

export function OddsMarketView({ market }: Props) {
  const period = detectPeriod(market.name);
  const overUnder = isOverUnder(market.name);
  const selections = orderSelections(market);

  return (
    <section className={`odds-market${overUnder ? ' odds-market--overunder' : ''} odds-market--${period.toLowerCase()}`}>
      <h3 className="odds-market__title">
        {market.name}
        {period !== 'FULL' && <span className="odds-market__period-tag">{period === '1H' ? '1T' : '2T'}</span>}
      </h3>
      <div className="odds-market__grid">
        {selections.map((sel) => (
          <OddButton key={`${market.id}::${sel.id}`} selection={sel} />
        ))}
      </div>
    </section>
  );
}

type GroupedProps = {
  markets: OddsMarket[];
};

const PERIOD_LABELS: Record<Period, string> = {
  FULL: 'Jogo Inteiro',
  '1H': '1º Tempo',
  '2H': '2º Tempo',
};

const PERIOD_ORDER: Period[] = ['FULL', '1H', '2H'];

export function OddsMarketsGrouped({ markets }: GroupedProps) {
  const groups: Record<Period, OddsMarket[]> = { FULL: [], '1H': [], '2H': [] };
  for (const m of markets) {
    groups[detectPeriod(m.name)].push(m);
  }

  return (
    <div className="odds-groups">
      {PERIOD_ORDER.map((p) => {
        const list = groups[p];
        if (list.length === 0) return null;
        return (
          <div key={p} className="odds-group">
            <h3 className="odds-group__title">{PERIOD_LABELS[p]}</h3>
            <div className="odds-group__list">
              {list.map((m) => (
                <OddsMarketView key={m.id} market={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
