import { Edit3, History, Sparkles } from 'lucide-react';
import type { GovMacroParam } from '../../api';
import MacroScopeBadge from './MacroScopeBadge';
import {
  getMeta,
  formatValue,
  MACRO_PARAM_GROUP_LABELS,
  MACRO_PARAM_GROUP_ORDER,
  type MacroParamMeta,
  type MacroParamGroup,
} from './macroParamCatalog';

interface MacroParamListProps {
  params: GovMacroParam[];
  onEdit?: (param: GovMacroParam) => void;
  onShowHistory?: (key: string) => void;
  emptyMessage?: string;
  catalog?: Record<string, MacroParamMeta>;
}

const SCOPE_ORDER: Record<string, number> = { global: 0, bot: 1, group: 2 };
const GROUP_ORDER: Record<MacroParamGroup, number> = MACRO_PARAM_GROUP_ORDER.reduce(
  (acc, g, idx) => ({ ...acc, [g]: idx }),
  {} as Record<MacroParamGroup, number>,
);

export default function MacroParamList({
  params,
  onEdit,
  onShowHistory,
  emptyMessage = 'Nenhum parâmetro encontrado',
  catalog,
}: MacroParamListProps) {
  if (params.length === 0) {
    return (
      <div className="bg-panel rounded-[2rem] border border-border/50 p-12 text-center">
        <div className="text-[10px] font-black uppercase text-muted tracking-widest">{emptyMessage}</div>
      </div>
    );
  }

  const enriched = params.map((p) => {
    const meta = (catalog && catalog[p.key]) || getMeta(p.key);
    return { param: p, meta };
  });

  const sorted = enriched.sort((a, b) => {
    const sa = SCOPE_ORDER[a.param.scope_type] ?? 99;
    const sb = SCOPE_ORDER[b.param.scope_type] ?? 99;
    if (sa !== sb) return sa - sb;
    const ga = a.meta?.group ? GROUP_ORDER[a.meta.group] ?? 99 : 99;
    const gb = b.meta?.group ? GROUP_ORDER[b.meta.group] ?? 99 : 99;
    if (ga !== gb) return ga - gb;
    return a.param.key.localeCompare(b.param.key);
  });

  return (
    <div className="space-y-6">
      {sorted.map(({ param: p, meta }, idx) => {
        const prevGroup = idx > 0 ? sorted[idx - 1].meta?.group : undefined;
        const showGroupHeader = meta?.group && meta.group !== prevGroup;
        return (
          <div key={`${p.scope_type}-${p.scope_ref}-${p.key}-${idx}`} className="space-y-3">
            {showGroupHeader && (
              <div className="flex items-center gap-2 pt-2">
                <Sparkles size={12} className="text-primary" />
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black">
                  {MACRO_PARAM_GROUP_LABELS[meta!.group!]}
                </div>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            )}
            <div className="bg-panel rounded-2xl border border-border/50 p-5 flex items-center gap-4 hover:shadow-md transition-all">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {meta ? (
                    <div className="text-sm font-black text-black">{meta.label}</div>
                  ) : (
                    <code className="text-sm font-black text-black break-all">{p.key}</code>
                  )}
                  <MacroScopeBadge
                    scope={p.scope_type}
                    scopeRef={p.scope_type !== 'global' ? p.scope_ref : undefined}
                  />
                  <span className="text-[8px] font-black uppercase text-muted bg-border/30 px-2 py-0.5 rounded-full">
                    v{p.version}
                  </span>
                </div>
                {meta?.description && (
                  <div className="text-[11px] font-medium text-muted leading-snug">{meta.description}</div>
                )}
                <div className="flex items-baseline gap-3 pt-1 flex-wrap">
                  <div className="text-base font-mono font-black text-black break-all">
                    {meta ? formatValue(p.value, meta.kind) : p.value}
                  </div>
                  {meta && (
                    <div className="text-[9px] font-bold text-muted uppercase tracking-wider">
                      padrão: {formatValue(meta.default, meta.kind)}
                    </div>
                  )}
                </div>
                <div className="text-[8px] font-mono text-muted/60 uppercase tracking-wider pt-0.5">
                  {p.key}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onShowHistory && (
                  <button
                    onClick={() => onShowHistory(p.key)}
                    className="p-4 rounded-2xl text-muted hover:text-black hover:bg-border/20 transition-all border-2 border-transparent hover:border-border"
                    title="Ver histórico"
                  >
                    <History size={18} />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(p)}
                    className="px-6 py-4 bg-black text-primary hover:bg-primary hover:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center gap-2 group/btn"
                  >
                    <Edit3 size={16} className="group-hover/btn:rotate-12 transition-transform" />
                    EDITAR
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
