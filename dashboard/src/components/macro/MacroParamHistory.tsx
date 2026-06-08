import { useState } from 'react';
import { History, X } from 'lucide-react';
import type { GovMacroParamChange } from '../../api';
import { showToast } from '../Toast';

interface MacroParamHistoryProps {
  paramKey: string;
  fetchHistory: (key: string) => Promise<GovMacroParamChange[]>;
  onClose: () => void;
}

export default function MacroParamHistory({ paramKey, fetchHistory, onClose }: MacroParamHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<GovMacroParamChange[]>([]);

  useState(() => {
    (async () => {
      try {
        const data = await fetchHistory(paramKey);
        setHistory(data);
      } catch (e: any) {
        showToast.error('Falha ao carregar histórico');
      } finally {
        setLoading(false);
      }
    })();
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-panel rounded-[2rem] border border-border/50 shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History size={20} className="text-black" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Histórico de Mudanças</div>
              <h3 className="text-xl font-black uppercase tracking-tighter break-all">{paramKey}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-border/20">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center text-[10px] font-black uppercase text-muted py-12">Carregando...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-[10px] font-black uppercase text-muted py-12">Nenhuma mudança registrada</div>
          ) : (
            history.map((change, idx) => (
              <div key={idx} className="bg-surface border border-border/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-black uppercase tracking-wider text-muted">
                    v{change.version} · {change.scope_type} · {new Date(change.changed_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-red-500 line-through opacity-70">{change.old_value || '(vazio)'}</span>
                  <span className="text-muted">→</span>
                  <span className="text-green-600 font-black">{change.new_value}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
