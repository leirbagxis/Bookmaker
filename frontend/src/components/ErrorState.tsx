type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="state__button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
