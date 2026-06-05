export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <div className="state__spinner" />
      <p>{label}</p>
    </div>
  );
}
