import { useState } from 'react';
import { Save, X, Info } from 'lucide-react';
import type { GovMacroParam } from '../../api';
import { getMeta, isEnumParam, type MacroParamMeta } from './macroParamCatalog';

interface MacroParamEditorProps {
  param: GovMacroParam;
  onSave: (newValue: string, reason: string) => Promise<void>;
  onClose: () => void;
  catalog?: Record<string, MacroParamMeta>;
}

export default function MacroParamEditor({ param, onSave, onClose, catalog }: MacroParamEditorProps) {
  const meta = (catalog && catalog[param.key]) || getMeta(param.key);
  const [value, setValue] = useState(param.value || meta?.default || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!reason.trim()) {
      setError('Motivo é obrigatório');
      return;
    }
    if (value === param.value) {
      setError('Valor inalterado');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(value, reason.trim());
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const inputHint = meta?.unit || '';
  const isEnum = meta ? isEnumParam(meta) : false;

  const valuePlaceholder = meta
    ? isEnum
      ? 'Selecione uma opção'
      : meta.kind === 'percent'
        ? 'Ex: 2.5'
        : meta.kind === 'csv'
          ? '100,500,1000'
          : '0'
    : '';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-panel rounded-[2rem] border border-border/50 shadow-2xl p-8 max-w-md w-full space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Editar Parâmetro</div>
          <h3 className="text-2xl font-black uppercase tracking-tighter break-all">
            {meta?.label || param.key}
          </h3>
          {meta?.description && (
            <div className="text-[11px] text-muted font-medium leading-snug">{meta.description}</div>
          )}
          {meta?.hint && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              <Info size={11} />
              {meta.hint}
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-wider pt-1 flex-wrap">
            <span>Escopo: {param.scope_type}</span>
            <span>·</span>
            <span>Versão atual: v{param.version}</span>
            {meta && (
              <>
                <span>·</span>
                <span>Default: <span className="text-black">{meta.default}</span></span>
              </>
            )}
          </div>
          <div className="text-[8px] font-mono text-muted/60 uppercase tracking-wider">
            chave: {param.key}
          </div>
        </header>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-2 flex items-center gap-1">
            Valor {inputHint && <span className="opacity-70">({inputHint.trim() || 'CSV'})</span>}
          </label>
          {isEnum && meta?.options ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-black outline-none focus:border-black transition-all"
              autoFocus
            >
              {!meta.options.some((o) => o.value === value) && (
                <option value={value}>{value}</option>
              )}
              {meta.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.description ? ` — ${opt.description}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={valuePlaceholder}
              className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-black outline-none focus:border-black transition-all"
              autoFocus
            />
          )}
          {meta?.example && !isEnum && (
            <div className="text-[10px] text-muted ml-2 italic">{meta.example}</div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-2">Motivo da mudança *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: ajuste de política de juros pós-stress test"
            className="w-full bg-surface border-2 border-border rounded-2xl p-4 text-sm font-bold outline-none focus:border-black transition-all resize-none"
          />
        </div>

        {error && (
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 border border-red-100 rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-surface border-2 border-border text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-border/20 transition-all"
          >
            <X size={14} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-black text-primary py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary hover:text-black transition-all disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
