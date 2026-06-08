import { History, ArrowUpRight, ArrowDownLeft, User as UserIcon, Info } from 'lucide-react';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const getOperationLabel = (type: string) => {
  switch (type) {
    case 'purchase_web':
    case 'purchase': return 'Compra na Loja';
    case 'admin_add': return 'Crédito Manual';
    case 'admin_reduce': return 'Débito Manual';
    case 'reward': return 'Recompensa';
    case 'sell_shop_web':
    case 'sell_shop': return 'Venda de Item';
    case 'consume': return 'Uso de Item';
    case 'sell_player': return 'Transferência (Venda)';
    case 'buy_player': return 'Transferência (Compra)';
    default: return type.replace(/_/g, ' ').toUpperCase();
  }
};

interface LogsTabProps {
  logs: any[];
  getLogReason: (log: any) => string;
  botConfig: any;
}

type FilterType = 'all' | 'admin' | 'shop' | 'consume' | 'transfer' | 'reward';

export default function LogsTab({ logs, getLogReason, botConfig }: LogsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    return logs.filter(log => {
      switch (activeFilter) {
        case 'admin': return log.operation_type === 'admin_add' || log.operation_type === 'admin_reduce';
        case 'shop': return log.operation_type === 'purchase' || log.operation_type === 'purchase_web' || log.operation_type === 'sell_shop' || log.operation_type === 'sell_shop_web';
        case 'consume': return log.operation_type === 'consume';
        case 'transfer': return log.operation_type === 'sell_player' || log.operation_type === 'buy_player';
        case 'reward': return log.operation_type === 'reward';
        default: return true;
      }
    });
  }, [logs, activeFilter]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'admin', label: 'Administrativo' },
    { id: 'shop', label: 'Loja (C/V)' },
    { id: 'consume', label: 'Itens Usados' },
    { id: 'transfer', label: 'Transferências' },
    { id: 'reward', label: 'Recompensas' },
  ];

  return (
    <section className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-black rounded-2xl text-primary shadow-xl group"><History size={24} className="group-hover:rotate-[-45deg] transition-transform duration-700" /></div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Trilha Auditoria</h3>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <div className="flex items-center gap-2 bg-surface p-1 rounded-2xl border border-border">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  activeFilter === filter.id 
                    ? "bg-black text-primary shadow-lg" 
                    : "text-muted hover:text-black hover:bg-black/5"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-panel rounded-[2rem] shadow-sm p-0 overflow-hidden transition-all hover:shadow-md border border-border/50 shadow-2xl duration-500">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[700px] table-fixed">
            <thead className="bg-black text-white text-[8px] font-black uppercase tracking-widest border-b border-white/10 sticky top-0">
              <tr>
                <th className="px-5 py-4 w-[130px]">Operação</th>
                <th className="px-5 py-4 w-[160px]">Entidade</th>
                <th className="px-5 py-4">Contexto / Detalhes</th>
                <th className="px-5 py-4 w-[140px]">Data & Hora</th>
                <th className="px-5 py-4 text-right w-[110px]">Magnitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(filteredLogs || []).map((log: any) => (
                <tr key={log.id} className="hover:bg-surface transition-all duration-300">
                  <td className="px-5 py-4">
                    <span className={cn(
                      "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase flex items-center gap-1 w-fit",
                      log.amount > 0 ? "border-green-500/50 text-green-600 bg-green-50" : "border-red-500/50 text-red-600 bg-red-50"
                    )}>
                      {log.amount > 0 ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                      {getOperationLabel(log.operation_type)}
                    </span>
                  </td>
                  <td className="px-5 py-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <UserIcon size={12} className="text-muted" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase truncate text-black">{log.user?.first_name || 'NULL'}</div>
                        <div className="text-[7px] font-bold text-muted">ID:{log.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[10px] font-bold uppercase text-black/70 truncate flex items-center gap-2">
                      <Info size={10} className="text-muted shrink-0" />
                      {getLogReason(log)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[10px] font-black text-black tabular-nums">{new Date(log.created_at).toLocaleDateString()}</div>
                    <div className="text-[7px] font-bold text-muted uppercase tabular-nums">{new Date(log.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-black tabular-nums text-[13px]">
                    <span className={log.amount > 0 ? "text-green-600" : "text-red-600"}>
                      {log.amount > 0 ? '+' : ''}{botConfig.currency_symbol} {log.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {(filteredLogs || []).map((log: any) => (
          <div key={log.id} className="bg-panel rounded-[2rem] shadow-sm p-5 border border-border/50 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <span className={cn("text-[7px] font-black px-2 py-0.5 rounded-full border uppercase", log.amount > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>{getOperationLabel(log.operation_type)}</span>
              <span className={cn("text-[12px] font-black tabular-nums", log.amount > 0 ? "text-green-600" : "text-red-600")}>
                {log.amount > 0 ? '+' : ''}{botConfig.currency_symbol} {log.amount.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon size={12} className="text-muted" />
              <div className="text-[10px] font-black uppercase text-black truncate">{log.user?.first_name || 'Usuário'} (UID:{log.user_id})</div>
            </div>
            <div className="bg-surface p-2.5 rounded-xl border border-border/50 text-[9px] font-bold text-muted uppercase leading-snug flex items-start gap-2">
              <Info size={10} className="shrink-0 mt-0.5" /> {getLogReason(log)}
            </div>
            <div className="text-[7px] font-bold text-muted text-right mt-3 uppercase tabular-nums">{new Date(log.created_at).toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

