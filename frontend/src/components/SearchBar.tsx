import type { ChangeEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Buscar time ou campeonato…', ariaLabel = 'Buscar' }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        className="w-full bg-panel rounded-full py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm font-bold placeholder:font-normal placeholder:text-muted"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent text-lg font-black"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
        >
          ×
        </button>
      )}
    </div>
  );
}
