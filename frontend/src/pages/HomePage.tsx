import { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { SearchBar } from '../components/SearchBar';
import { CompetitionSection } from '../components/CompetitionSection';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { LastUpdated } from '../components/LastUpdated';
import type { CompetitionGroup } from '../types/match';

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
  const { status, send, subscribe } = useWebSocket();
  const [tab, setTab] = useState<Tab>('Todos');
  const [groups, setGroups] = useState<CompetitionGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'open') return;
    const unsub = subscribe((msg) => {
      if (msg.type === 'TODAY_MATCHES' || msg.type === 'MATCHES_UPDATED') {
        setGroups(msg.data as CompetitionGroup[]);
        setError(null);
        setLastUpdated(Date.now());
      } else if (msg.type === 'ERROR') {
        setError(msg.message);
      }
    });
    send({ type: 'GET_TODAY_MATCHES' });
    return unsub;
  }, [status, send, subscribe]);

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

  const requestRefresh = () => {
    setError(null);
    send({ type: 'GET_TODAY_MATCHES' });
  };

  return (
    <div className="home">
      <div className="home__toolbar">
        <SearchBar value={search} onChange={setSearch} />
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div className="home__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`home__tab${tab === t ? ' home__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="home__content">
        {error && <ErrorState message={error} onRetry={requestRefresh} />}

        {!error && groups === null && <LoadingState label="Carregando partidas..." />}

        {!error && groups && filteredGroups && filteredGroups.length === 0 && (
          <EmptyState
            title={search ? 'Nenhum resultado para sua busca' : 'Nenhum jogo disponível nesta aba.'}
            description={search ? 'Tente outro time ou campeonato.' : 'Volte mais tarde ou troque de aba.'}
          />
        )}

        {!error && filteredGroups && filteredGroups.length > 0 && (
          <>
            <p className="home__count" aria-live="polite">
              {totalMatches} {totalMatches === 1 ? 'jogo' : 'jogos'}
            </p>
            <div className="home__list">
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
