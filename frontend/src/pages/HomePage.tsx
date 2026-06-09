import { useMemo, useState } from 'react';
import { useMatches } from '../context/MatchesContext';
import { SearchBar } from '../components/SearchBar';
import { CompetitionSection } from '../components/CompetitionSection';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { LastUpdated } from '../components/LastUpdated';

const TABS = ['Todos', 'Ao vivo', 'Próximos'] as const;
type Tab = (typeof TABS)[number];

function isLive(m: { status?: string }): boolean {
  return m.status === 'LIVE';
}

function isUpcoming(m: { status?: string; startTime: string }): boolean {
  if (m.status === 'LIVE' || m.status === 'FT') return false;
  if (!m.startTime) return true;
  const t = new Date(m.startTime).getTime();
  return Number.isFinite(t) ? t > Date.now() : true;
}

export function HomePage() {
  const { groups, isLoading, error, lastUpdated, refresh } = useMatches();
  const [tab, setTab] = useState<Tab>('Todos');
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const q = search.trim().toLowerCase();
    return groups
      .map((g) => {
        const matches = g.matches.filter((m) => {
          if (tab === 'Ao vivo' && !isLive(m)) return false;
          if (tab === 'Próximos' && !isUpcoming(m)) return false;
          if (q) {
            const hay = `${m.homeTeam} ${m.awayTeam} ${m.competition}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return { ...g, matches };
      })
      .filter((g) => g.matches.length > 0);
  }, [groups, tab, search]);

  const totalMatches = filteredGroups?.reduce((acc, g) => acc + g.matches.length, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} />
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`px-5 py-2 rounded-full font-black uppercase text-xs tracking-widest whitespace-nowrap transition-all shadow-sm ${
              tab === t ? 'bg-accent text-white' : 'bg-panel text-muted hover:bg-border'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {error && <ErrorState message={error} onRetry={refresh} />}

        {!error && isLoading && groups === null && <LoadingState label="Carregando partidas..." />}

        {!error && groups && filteredGroups && filteredGroups.length === 0 && (
          <EmptyState
            title={search ? 'Nenhum resultado' : 'Nenhum jogo disponível'}
            description={search ? 'Tente outro time ou campeonato.' : 'Volte mais tarde ou troque de aba.'}
          />
        )}

        {!error && filteredGroups && filteredGroups.length > 0 && (
          <>
            <p className="text-xs text-muted font-bold uppercase tracking-[0.15em]" aria-live="polite">
              {totalMatches} {totalMatches === 1 ? 'jogo' : 'jogos'}
            </p>
            <div className="flex flex-col gap-6">
              {filteredGroups.map((g) => (
                <CompetitionSection key={g.name} group={g} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
