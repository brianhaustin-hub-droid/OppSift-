import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({
  action,
  description,
  title,
}: EmptyStateProps) {
  return (
    <section aria-labelledby="empty-state-title" className="feedback-state">
      <span aria-hidden="true" className="feedback-state__mark">
        —
      </span>
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-live="polite" className="feedback-inline" role="status">
      <span aria-hidden="true" className="feedback-inline__spinner" />
      {label}
    </div>
  );
}

export function ErrorState({
  description,
  onRetry,
  title = "We couldn’t load this view",
}: {
  description: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <section aria-labelledby="error-state-title" className="feedback-state">
      <span aria-hidden="true" className="feedback-state__mark">
        !
      </span>
      <h2 id="error-state-title">{title}</h2>
      <p>{description}</p>
      {onRetry && (
        <button className="ui-button ui-button--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}
