import { useEffect, useState } from 'react';
import { RefreshCcw, TrendingUp, TrendingDown, AlertTriangle, Users, Lock } from 'lucide-react';
import { fetchGovGroupHealth, type GovGroupHealth } from '../../api';
import { showToast } from '../Toast';
import MacroHealthBadge from '../macro/MacroHealthBadge';

const formatNumber = (v: number, decimals = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);

export default function GroupHealthTab() {
  const [items, setItems] = useState<GovGroupHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGovGroupHealth();
      setItems(data);
    } catch (e: any) {
      showToast.error('Falha ao carregar saúde dos grupos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-center text-[10px] font-black uppercase text-muted py-12">Carregando...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-panel rounded-[2rem] border border-border/50 p-12 text-center">
        <div className="text-[10px] font-black uppercase text-muted tracking-widest">Nenhum grupo ativo no momento</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={load} className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-black flex items-center gap-2">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(items || []).map((g) => (
          <div key={g.bot_group_id} className="bg-panel rounded-[2rem] border border-border/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted">Bot {g.bot_id}</div>
                <h3 className="text-xl font-black uppercase tracking-tighter">{g.title || `Grupo ${g.group_id}`}</h3>
              </div>
              <MacroHealthBadge state={g.operational_state} score={g.operational_score} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface rounded-xl p-4 border border-border/30">
                <div className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1">
                  <TrendingUp size={10} /> Caixa
                </div>
                <div className="text-base font-black tabular-nums">R$ {formatNumber(g.treasury_balance)}</div>
              </div>
              <div className="bg-surface rounded-xl p-4 border border-border/30">
                <div className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1">
                  <Lock size={10} /> Bloqueado
                </div>
                <div className="text-base font-black tabular-nums">R$ {formatNumber(g.treasury_locked)}</div>
              </div>
              <div className="bg-surface rounded-xl p-4 border border-border/30">
                <div className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1">
                  <TrendingDown size={10} /> Dívida
                </div>
                <div className={`text-base font-black tabular-nums ${g.accumulated_debt > 0 ? 'text-red-600' : ''}`}>
                  R$ {formatNumber(g.accumulated_debt)}
                </div>
              </div>
              <div className="bg-surface rounded-xl p-4 border border-border/30">
                <div className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1">
                  <Users size={10} /> Pendente
                </div>
                <div className="text-base font-black tabular-nums">R$ {formatNumber(g.pending_payouts)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-muted">Liquidez</div>
                <div className="text-sm font-black tabular-nums">{formatNumber(g.liquidity_ratio, 4)}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-muted">Alavancagem</div>
                <div className="text-sm font-black tabular-nums">{formatNumber(g.leverage_ratio, 4)}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-muted">Lock Users</div>
                <div className="text-sm font-black tabular-nums">{formatNumber(g.user_lock_rate, 4)}</div>
              </div>
            </div>

            {g.signals && g.signals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(g.signals || []).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle size={9} /> {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
