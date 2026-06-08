import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Info, Edit3, Plus, X, Save } from 'lucide-react';
import {
  adminFetchBotMacroParams,
  adminUpsertBotMacroParam,
  type GovMacroParam,
} from '../../api';
import { showToast } from '../Toast';
import MacroParamList from '../macro/MacroParamList';
import MacroScopeBadge from '../macro/MacroScopeBadge';
import { MACRO_PARAM_CATALOG, formatValue, getMeta, isEnumParam } from '../macro/macroParamCatalog';

interface MacroTabProps {
  botId: string;
}

const ADMIN_EDITABLE_KEYS = [
  'user_milestone_target',
  'user_milestone_reward',
  'user_milestone_period',
  'user_milestone_cooldown_minutes',
  'cooldown_per_user_minutes',
] as const;

type EditableKey = (typeof ADMIN_EDITABLE_KEYS)[number];

export default function MacroTab({ botId }: MacroTabProps) {
  const [params, setParams] = useState<GovMacroParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: EditableKey; value: string; version: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchBotMacroParams(botId);
      setParams(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Falha ao carregar parâmetros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [botId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-xl">
        <Activity className="animate-spin text-black mb-md" size={32} />
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">Carregando parâmetros macro...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 text-center">
        <div className="text-[10px] font-black uppercase text-red-500 tracking-widest">Erro</div>
        <div className="text-sm font-bold text-red-900 mt-2">{error}</div>
      </div>
    );
  }

  const findForKey = (key: string, scopeType: string) =>
    params.find((p) => p.key === key && p.scope_type === scopeType);

  const overrides = params.filter((p) => p.scope_type !== 'global').length;
  const scopesPresent = Array.from(new Set(params.map((p) => p.scope_type)));

  const editableEntries = ADMIN_EDITABLE_KEYS.map((key) => {
    const botOverride = findForKey(key, 'bot');
    const globalParam = findForKey(key, 'global');
    const effective = botOverride ?? globalParam;
    return { key, botOverride, global: globalParam, effective };
  });

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-black rounded-xl text-primary shadow-lg">
          <TrendingUp size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Macroeconomia do Bot</h3>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
            {params.length} parâmetros ativos · {overrides} overrides · {ADMIN_EDITABLE_KEYS.length} editáveis
          </p>
        </div>
      </header>

      <div className="bg-panel rounded-2xl border border-border/50 p-4 flex items-center gap-3 flex-wrap">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted">Escopos:</span>
        {scopesPresent.includes('global') && <MacroScopeBadge scope="global" />}
        {scopesPresent.includes('bot') && <MacroScopeBadge scope="bot" />}
        {scopesPresent.includes('group') && <MacroScopeBadge scope="group" />}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-black uppercase tracking-tighter">Overrides deste Bot (Editáveis)</h4>
        <div className="space-y-3">
          {editableEntries.map(({ key, botOverride, effective }) => {
            const meta = getMeta(key);
            if (!meta || !effective) return null;
            return (
              <div key={key} className="bg-panel rounded-2xl border border-border/50 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-black text-black">{meta.label}</div>
                      {botOverride ? (
                        <MacroScopeBadge scope="bot" scopeRef={botOverride.scope_ref} />
                      ) : (
                        <MacroScopeBadge scope="global" />
                      )}
                      {effective.version !== undefined && (
                        <span className="text-[8px] font-black uppercase text-muted bg-border/30 px-2 py-0.5 rounded-full">
                          v{effective.version}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-muted leading-snug">{meta.description}</div>
                    <div className="text-base font-mono font-black text-black pt-0.5">
                      {formatValue(effective.value, meta.kind)}
                    </div>
                    <div className="text-[8px] font-mono text-muted/60 uppercase tracking-wider pt-0.5">{key}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditing({ key, value: effective.value, version: effective.version })}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-black text-primary hover:bg-primary hover:text-black transition-all flex items-center gap-2"
                    >
                      {botOverride ? <Edit3 size={12} /> : <Plus size={12} />}
                      {botOverride ? 'Editar' : 'Criar Override'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-black uppercase tracking-tighter">Todos os Parâmetros (somente leitura)</h4>
        <MacroParamList
          params={params}
          catalog={MACRO_PARAM_CATALOG}
          emptyMessage="Nenhum parâmetro macro definido para este bot"
        />
      </div>

      <div className="bg-blue-50 border-2 border-blue-100 p-5 rounded-[1.5rem] flex gap-3">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <p className="text-[10px] font-bold text-blue-900 uppercase tracking-tight leading-relaxed">
          Você pode criar overrides de bot para meta de marco, recompensa, período do bônus, cooldown do marco e cooldown de comandos. Demais parâmetros macro são editados exclusivamente pelo painel GOV com auditoria. O override deste bot prevalece sobre o valor global.
        </p>
      </div>

      {editing && (
        <AdminOverrideEditor
          keyName={editing.key}
          initialValue={editing.value}
          saving={saving}
          onSave={async (newValue, reason) => {
            setSaving(true);
            try {
              await adminUpsertBotMacroParam(botId, { key: editing.key, value: newValue, reason });
              showToast.success('Override atualizado');
              setEditing(null);
              await load();
            } catch (e: any) {
              showToast.error(e?.response?.data?.error || 'Falha ao salvar');
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

interface AdminOverrideEditorProps {
  keyName: string;
  initialValue: string;
  saving: boolean;
  onSave: (value: string, reason: string) => Promise<void>;
  onClose: () => void;
}

function AdminOverrideEditor({ keyName, initialValue, saving, onSave, onClose }: AdminOverrideEditorProps) {
  const meta = getMeta(keyName);
  const [value, setValue] = useState(initialValue);
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-panel rounded-[2rem] border border-border/50 shadow-2xl p-8 max-w-md w-full space-y-6" onClick={(e) => e.stopPropagation()}>
        <header className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Override de Bot</div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">
            {meta?.label || keyName}
          </h3>
          {meta && (
            <div className="text-[11px] text-muted font-medium leading-snug">{meta.description}</div>
          )}
          <div className="text-[10px] text-muted font-bold uppercase tracking-widest pt-1">
            Escopo: BOT · Valor atual: {initialValue}
          </div>
          <div className="text-[8px] font-mono text-muted/60 uppercase tracking-wider">chave: {keyName}</div>
        </header>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-2">
            Novo valor {meta?.unit && <span className="opacity-70">({meta.unit.trim() || 'CSV'})</span>}
          </label>
          {meta && isEnumParam(meta) ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-black outline-none focus:border-black transition-all"
              autoFocus
            >
              {meta.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-black outline-none focus:border-black transition-all"
              autoFocus
            />
          )}
          {meta?.hint && (
            <div className="text-[10px] font-medium text-muted/80 ml-2 leading-snug">{meta.hint}</div>
          )}
          {meta?.example && (
            <div className="text-[10px] font-mono text-muted/60 ml-2">
              exemplo: {meta.example}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-2">Motivo *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: ajustar meta de marco para recompensar usuários mais ativos"
            className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-black transition-all resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-surface border-2 border-border text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-border/20 transition-all"
          >
            <X size={14} /> Cancelar
          </button>
          <button
            onClick={() => onSave(value, reason.trim()).catch(() => {})}
            disabled={saving || !reason.trim() || value === initialValue}
            className="flex-1 bg-black text-primary py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary hover:text-black transition-all disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
