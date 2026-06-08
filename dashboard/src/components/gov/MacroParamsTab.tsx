import { useEffect, useState } from 'react';
import { Filter, RefreshCcw } from 'lucide-react';
import {
  fetchGovMacroParams,
  updateGovMacroParams,
  fetchGovMacroParamChanges,
  type GovMacroParam,
} from '../../api';
import { showToast } from '../Toast';
import MacroParamList from '../macro/MacroParamList';
import MacroParamEditor from '../macro/MacroParamEditor';
import MacroParamHistory from '../macro/MacroParamHistory';
import { MACRO_PARAM_CATALOG } from '../macro/macroParamCatalog';

const SCOPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'global', label: 'Global' },
  { id: 'bot', label: 'Bot' },
  { id: 'group', label: 'Grupo' },
];

export default function MacroParamsTab() {
  const [params, setParams] = useState<GovMacroParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('all');
  const [editing, setEditing] = useState<GovMacroParam | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters = scope === 'all' ? undefined : { scope_type: scope };
      const data = await fetchGovMacroParams(filters);
      setParams(data);
    } catch (e: any) {
      showToast.error('Falha ao carregar parâmetros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [scope]);

  const handleSave = async (newValue: string, reason: string) => {
    if (!editing) return;
    try {
      await updateGovMacroParams([
        {
          scope_type: editing.scope_type,
          scope_ref: editing.scope_ref,
          key: editing.key,
          value: newValue,
          reason,
        },
      ]);
      showToast.success('Parâmetro atualizado');
      setEditing(null);
      await load();
    } catch (e: any) {
      console.error('GOV update macro-params failed', {
        status: e?.response?.status,
        url: e?.config?.url,
        data: e?.response?.data,
      });
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e?.message || 'erro desconhecido';
      showToast.error(status ? `Falha ao salvar (HTTP ${status}): ${msg}` : `Falha ao salvar: ${msg}`);
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">Escopo:</span>
          {SCOPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setScope(f.id)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
                scope === f.id ? 'bg-black text-primary' : 'bg-surface text-muted hover:text-black'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-black flex items-center gap-2 self-start"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-[10px] font-black uppercase text-muted py-12">Carregando parâmetros...</div>
      ) : (
        <MacroParamList
          params={params}
          onEdit={setEditing}
          onShowHistory={setHistoryKey}
          emptyMessage={scope === 'all' ? 'Nenhum parâmetro cadastrado' : `Nenhum parâmetro no escopo ${scope}`}
          catalog={MACRO_PARAM_CATALOG}
        />
      )}

      {editing && (
        <MacroParamEditor
          param={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          catalog={MACRO_PARAM_CATALOG}
        />
      )}

      {historyKey && (
        <MacroParamHistory
          paramKey={historyKey}
          fetchHistory={fetchGovMacroParamChanges}
          onClose={() => setHistoryKey(null)}
        />
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="bg-blue-50 border-2 border-blue-100 p-5 rounded-[2rem] space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">
              Limite por estado (usa receita de 7 dias)
            </div>
            <p className="text-[10px] font-bold text-blue-900 leading-relaxed">
              Os 3 parâmetros <strong>Saudável / Atenção / Recuperação</strong> controlam o teto de dívida
              permitido em cada estado de saúde do grupo, e todos se baseiam na <strong>receita dos últimos
              7 dias</strong>. Quando o grupo piora, o teto cai automaticamente.
            </p>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Teto duro (usa receita de 30 dias)
            </div>
            <p className="text-[10px] font-bold text-amber-900 leading-relaxed">
              O <strong>Teto duro de dívida</strong> é absoluto: a dívida ativa NUNCA pode passar deste
              percentual da <strong>receita dos últimos 30 dias</strong>, independente do estado de saúde.
              É a última rede de segurança do sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
