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

  const over: typeof market.selections = [];
  const under: typeof market.selections = [];

  for (const sel of market.selections) {
    const n = normalize(sel.name);
    if (n.includes('mais') || n.includes('over')) {
      over.push(sel);
    } else if (n.includes('menos') || n.includes('under')) {
      under.push(sel);
    } else {
      // Fallback para nomes que não contenham as palavras chave (raro em over/under)
      over.push(sel);
    }
  }

  // Ordenar cada grupo numericamente se possível (ex: Mais 0.5, Mais 1.5)
  const sortByValue = (a: any, b: any) => {
    const valA = parseFloat(a.name.replace(/[^0-9.]/g, '')) || 0;
    const valB = parseFloat(b.name.replace(/[^0-9.]/g, '')) || 0;
    return valA - valB;
  };

  over.sort(sortByValue);
  under.sort(sortByValue);

  // Entrelaçar para manter o grid de 2 colunas: [Mais 0.5, Menos 0.5, Mais 1.5, Menos 1.5...]
  const result: typeof market.selections = [];
  const max = Math.max(over.length, under.length);
  for (let i = 0; i < max; i++) {
    if (over[i]) result.push(over[i]);
    if (under[i]) result.push(under[i]);
  }
  return result;
}

export function OddsMarketView({ market, homeTeam, awayTeam }: Props & { homeTeam?: string; awayTeam?: string }) {
  const period = detectPeriod(market.name);
  const overUnder = isOverUnder(market.name);
  const selections = orderSelections(market);

  return (
    <section className={`odds-market${overUnder ? ' odds-market--overunder' : ''} odds-market--${period.toLowerCase()}`}>
      <h3 className="odds-market__title">
        {market.name}
        {period !== 'FULL' && <span className="odds-market__period-tag">{period === '1H' ? '1T' : '2T'}</span>}
      </h3>
      <div className={`odds-market__grid odds-market__grid--cols-${Math.min(selections.length, 4)}`}>
        {selections.map((sel) => (
          <OddButton 
            key={`${market.id}::${sel.id}`} 
            selection={{ ...sel, homeTeam: sel.homeTeam || homeTeam, awayTeam: sel.awayTeam || awayTeam }} 
          />
        ))}
      </div>
    </section>
  );
}

type GroupedProps = {
  markets: OddsMarket[];
  homeTeam?: string;
  awayTeam?: string;
};

const PERIOD_LABELS: Record<Period, string> = {
  FULL: 'Jogo Inteiro',
  '1H': '1º Tempo',
  '2H': '2º Tempo',
};

const PERIOD_ORDER: Period[] = ['FULL', '1H', '2H'];

export function OddsMarketsGrouped({ markets, homeTeam, awayTeam }: GroupedProps) {
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
                <OddsMarketView key={m.id} market={m} homeTeam={homeTeam} awayTeam={awayTeam} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
