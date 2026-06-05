import { useEffect, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { CompetitionSection } from '../components/CompetitionSection';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import type { CompetitionGroup } from '../types/match';

const TABS = ['Hoje', 'Ao vivo', 'Futebol', 'Favoritos'] as const;
type Tab = (typeof TABS)[number];

export function HomePage() {
  const { status, send, subscribe } = useWebSocket();
  const [tab, setTab] = useState<Tab>('Hoje');
  const [groups, setGroups] = useState<CompetitionGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'open') return;
    const unsub = subscribe((msg) => {
      if (msg.type === 'TODAY_MATCHES') {
        setGroups(msg.data as CompetitionGroup[]);
        setError(null);
      } else if (msg.type === 'ERROR') {
        setError(msg.message);
      }
    });
    send({ type: 'GET_TODAY_MATCHES' });
    return unsub;
  }, [status, send, subscribe]);

  const requestRefresh = () => {
    setError(null);
    setGroups(null);
    send({ type: 'GET_TODAY_MATCHES' });
  };

  return (
    <div className="home">
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
        {tab !== 'Hoje' && (
          <EmptyState
            title="Em breve"
            description={`A aba "${tab}" ainda não está disponível nesta demonstração.`}
          />
        )}

        {tab === 'Hoje' && error && <ErrorState message={error} onRetry={requestRefresh} />}

        {tab === 'Hoje' && !error && groups === null && <LoadingState label="Carregando partidas..." />}

        {tab === 'Hoje' && !error && groups && groups.length === 0 && (
          <EmptyState
            title="Nenhum jogo com odds disponível hoje."
            description="Tente novamente mais tarde."
          />
        )}

        {tab === 'Hoje' && !error && groups && groups.length > 0 && (
          <div className="home__list">
            {groups.map((g) => (
              <CompetitionSection key={g.name} group={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
