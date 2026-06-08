import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const STATE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Saudavel: { bg: 'bg-green-100', text: 'text-green-700', label: 'Saudável' },
  Atencao: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Atenção' },
  Recuperacao: { bg: 'bg-red-100', text: 'text-red-700', label: 'Recuperação' },
};

export function MacroHealthBadge({ state, score }: { state: string; score?: number }) {
  const style = STATE_STYLES[state] || { bg: 'bg-gray-100', text: 'text-gray-700', label: state };
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider', style.bg, style.text)}>
      {style.label}
      {typeof score === 'number' && <span className="opacity-60">· {score}</span>}
    </span>
  );
}

export default MacroHealthBadge;
