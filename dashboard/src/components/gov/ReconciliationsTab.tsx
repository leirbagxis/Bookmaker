import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import { fetchGovReconciliations, type GovReconciliation } from '../../api';
import { showToast } from '../Toast';

const formatNumber = (v: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(v);

export default function ReconciliationsTab() {
  const [items, setItems] = useState<GovReconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGovReconciliations();
      setItems(data);
    } catch (e: any) {
      showToast.error('Falha ao carregar reconciliações');
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
        <div className="text-[10px] font-black uppercase text-muted tracking-widest">
          Nenhuma reconciliação registrada ainda
        </div>
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

      <div className="bg-panel rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-5 py-4">Data</th>
              <th className="px-5 py-4">Bot</th>
              <th className="px-5 py-4 text-right">Grupos</th>
              <th className="px-5 py-4 text-right">Δ Caixa</th>
              <th className="px-5 py-4 text-right">Δ Locked</th>
              <th className="px-5 py-4 text-right">Δ Users</th>
              <th className="px-5 py-4 text-right">|Δ| Total</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(items || []).map((r) => {
              const isPass = r.status === 'pass';
              return (
                <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-4 text-[10px] text-muted">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-4 text-[10px] font-mono font-bold">{r.bot_id}</td>
                  <td className="px-5 py-4 text-[10px] text-right font-bold tabular-nums">{r.group_count}</td>
                  <td className="px-5 py-4 text-[10px] text-right font-mono tabular-nums">{formatNumber(r.delta_group_available)}</td>
                  <td className="px-5 py-4 text-[10px] text-right font-mono tabular-nums">{formatNumber(r.delta_group_locked)}</td>
                  <td className="px-5 py-4 text-[10px] text-right font-mono tabular-nums">{formatNumber(r.delta_user_available)}</td>
                  <td className="px-5 py-4 text-[10px] text-right font-mono font-black tabular-nums">{formatNumber(r.delta_abs_total)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isPass ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
