import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error.message : 'The page failed to render.' };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('WebPulse QA render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
