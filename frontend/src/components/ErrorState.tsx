type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-error/10 text-error rounded-[2rem] animate-fade-in" role="alert">
      <p className="font-black uppercase tracking-tight mb-4">{message}</p>
      {onRetry && (
        <button type="button" className="bg-error text-white font-black uppercase text-xs px-6 py-2 rounded-full hover:opacity-90 transition-opacity" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
