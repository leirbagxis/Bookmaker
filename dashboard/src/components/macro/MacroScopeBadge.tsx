import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const SCOPE_STYLES: Record<string, { label: string; classes: string }> = {
  global: { label: 'Global', classes: 'bg-blue-100 text-blue-700' },
  bot: { label: 'Bot', classes: 'bg-purple-100 text-purple-700' },
  group: { label: 'Grupo', classes: 'bg-amber-100 text-amber-700' },
};

export function MacroScopeBadge({ scope, scopeRef }: { scope: string; scopeRef?: string }) {
  const style = SCOPE_STYLES[scope] || { label: scope, classes: 'bg-gray-100 text-gray-700' };
  return (
    <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap', style.classes)}>
      {style.label}
      {scope === 'bot' && scopeRef ? ` · ${scopeRef}` : ''}
    </span>
  );
}

export default MacroScopeBadge;
