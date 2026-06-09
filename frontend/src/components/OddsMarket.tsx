import { useState } from 'react';
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
  if (n.includes('1 tempo') || n.includes('1º tempo') || n.includes('1o tempo') || n.includes('1t') || n.includes('primeiro tempo')) {
    return '1H';
  }
  if (n.includes('2 tempo') || n.includes('2º tempo') || n.includes('2o tempo') || n.includes('2t') || n.includes('segundo tempo')) {
    return '2H';
  }
  return 'FULL';
}

function isOverUnder(name: string): boolean {
  const n = normalize(name);
  return n.includes('total') || n.includes('mais/menos') || n.includes('over/under');
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
      over.push(sel);
    }
  }

  const sortByValue = (a: any, b: any) => {
    const valA = parseFloat(a.name.replace(/[^0-9.]/g, '')) || 0;
    const valB = parseFloat(b.name.replace(/[^0-9.]/g, '')) || 0;
    return valA - valB;
  };

  over.sort(sortByValue);
  under.sort(sortByValue);

  const result: typeof market.selections = [];
  const max = Math.max(over.length, under.length);
  for (let i = 0; i < max; i++) {
    if (over[i]) result.push(over[i]);
    if (under[i]) result.push(under[i]);
  }
  return result;
}

export function OddsMarketView({ market, homeTeam, awayTeam, startTime }: Props & { homeTeam?: string; awayTeam?: string; startTime?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const period = detectPeriod(market.name);
  const overUnder = isOverUnder(market.name);
  const selections = orderSelections(market);
  
  const cols = overUnder ? 2 : Math.min(selections.length, 4);

  return (
    <div className={`flex flex-col ${isOpen ? 'mb-8 last:mb-0 gap-4' : 'mb-5 last:mb-0 border-b border-border/40 pb-5'}`}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left outline-none group/title py-1"
      >
        <h3 className="font-black uppercase tracking-tight text-[11px] text-muted flex items-center gap-2 group-hover/title:text-accent transition-colors">
          {market.name}
          {period !== 'FULL' && <span className="text-[9px] bg-border px-1.5 py-0.5 rounded-sm text-accent">{period === '1H' ? '1T' : '2T'}</span>}
          <span className="text-[9px] bg-surface px-1.5 py-0.5 rounded-sm text-muted font-normal">{selections.length} opções</span>
        </h3>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="grid gap-3 animate-fade-in" 
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {selections.map((sel) => (
            <OddButton 
              key={`${market.id}::${sel.id}`} 
              selection={{ 
                ...sel, 
                homeTeam: sel.homeTeam || homeTeam, 
                awayTeam: sel.awayTeam || awayTeam,
                startTime: sel.startTime || startTime
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

type GroupedProps = {
  markets: OddsMarket[];
  homeTeam?: string;
  awayTeam?: string;
  startTime?: string;
};

const PERIOD_LABELS: Record<Period, string> = {
  FULL: 'Jogo Inteiro',
  '1H': '1º Tempo',
  '2H': '2º Tempo',
};

const PERIOD_ORDER: Period[] = ['FULL', '1H', '2H'];

export function OddsMarketsGrouped({ markets, homeTeam, awayTeam, startTime }: GroupedProps) {
  const groups: Record<Period, OddsMarket[]> = { FULL: [], '1H': [], '2H': [] };
  for (const m of markets) {
    groups[detectPeriod(m.name)].push(m);
  }

  return (
    <div className="flex flex-col gap-6">
      {PERIOD_ORDER.map((p) => {
        const list = groups[p];
        if (list.length === 0) return null;
        return (
          <div key={p} className="refined-card !p-5 flex flex-col">
            <h3 className="status-label mb-4">{PERIOD_LABELS[p]}</h3>
            <div className="flex flex-col">
              {list.map((m) => (
                <OddsMarketView key={m.id} market={m} homeTeam={homeTeam} awayTeam={awayTeam} startTime={startTime} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
