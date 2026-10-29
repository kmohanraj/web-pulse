interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <section className="state state--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}
