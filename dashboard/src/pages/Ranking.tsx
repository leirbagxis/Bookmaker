import { useEffect, useState } from 'react';
import { fetchBalanceRanking, fetchMessagesRanking, getBotId } from '../api';
import { useBotConfig } from '../hooks/useBotConfig';
import { terminal } from '../components/Terminal';
import { Trophy, Coins, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Sub-components
import RankingTable from '../components/ranking/RankingTable';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface RankedUser {
  user_id: number;
  username: string;
  first_name: string;
  value: number;
  position: number;
}

interface RankingResponse {
  title: string;
  users: RankedUser[];
}

type RankingType = 'balance' | 'messages';

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<RankingType>('messages');
  const botConfig = useBotConfig();

  useEffect(() => {
    const loadRanking = async () => {
      const botId = getBotId();
      if (!botId) return;
      
      setLoading(true);
      try {
        const fetchFn = type === 'balance' ? fetchBalanceRanking : fetchMessagesRanking;
        terminal.log(`Carregando ranking de ${type === 'balance' ? 'saldo' : 'mensagens'}...`);
        const data = await fetchFn(botId);
        setRanking(data);
        terminal.success(`Ranking de ${type === 'balance' ? 'saldo' : 'mensagens'} atualizado.`);
      } catch (err) {
        terminal.error(`Falha ao carregar ranking de ${type === 'balance' ? 'saldo' : 'mensagens'}.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRanking();
  }, [type]);

  const obfuscateID = (id: number) => {
    const s = String(id);
    if (s.length <= 4) return s;
    return s.substring(0, 3) + "****" + s.substring(s.length - 2);
  };

  const formatValue = (value: number) => {
    if (type === 'balance') return '****';
    return value.toLocaleString('pt-BR');
  };

  if (loading && !ranking) return (
    <div className="flex flex-col items-center justify-center py-xl">
      <Trophy className="animate-bounce text-black/20 mb-md" size={32} />
      <div className="status-label">Carregando dados...</div>
    </div>
  );

  if (!ranking) return (
    <div className="refined-card bg-red-50 p-xl text-center border border-red-100">
      <div className="status-label text-red-500">Erro de Sincronização</div>
      <div className="text-sm font-bold opacity-60 text-red-900">Falha ao carregar o ranking.</div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-lg max-w-4xl pb-20">
      <header className="flex flex-col border-b border-border pb-md mb-xl gap-lg">
        <div>
          <div className="status-label">Classificações</div>
          <h2 className="text-4xl font-black text-black tracking-tighter uppercase">{ranking.title}</h2>
        </div>
        
        <div className="flex gap-md">
          <button 
            onClick={() => setType('messages')}
            className={cn(
              "flex-1 md:flex-none px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
              type === 'messages' 
                ? "bg-black text-white border-black" 
                : "bg-white text-muted border-border hover:border-black hover:text-black"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare size={14} />
              Mensagens
            </div>
          </button>
          <button 
            onClick={() => setType('balance')}
            className={cn(
              "flex-1 md:flex-none px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
              type === 'balance' 
                ? "bg-black text-white border-black" 
                : "bg-white text-muted border-border hover:border-black hover:text-black"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Coins size={14} />
              Saldo
            </div>
          </button>
        </div>
      </header>

      <RankingTable 
        users={ranking.users || []}
        type={type}
        botConfig={botConfig}
        formatValue={formatValue}
        obfuscateID={obfuscateID}
      />
    </div>
  );
}
