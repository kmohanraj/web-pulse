interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
