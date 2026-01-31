import { Component, type ReactNode } from 'react';

interface Props {
  type: string;
  instanceId: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    if (import.meta.env.DEV) {
      console.error(`[DashFlow] Widget "${this.props.type}" (${this.props.instanceId}):`, error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.instanceId !== this.props.instanceId || prevProps.type !== this.props.type) {
      this.setState({ hasError: false, error: null });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <WidgetErrorFallback
          type={this.props.type}
          instanceId={this.props.instanceId}
          error={this.state.error}
        />
      );
    }
    return this.props.children;
  }
}

interface WidgetErrorFallbackProps {
  type: string;
  instanceId: string;
  error: Error | null;
}

function WidgetErrorFallback({ type, instanceId, error }: WidgetErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
      <span className="text-red-400 text-lg mb-1">⚠</span>
      <span className="text-red-300 text-sm font-medium">Widget error</span>
      <span className="text-slate-500 text-xs mt-0.5">{type}</span>
      {error && import.meta.env.DEV && (
        <pre className="mt-2 text-[10px] text-red-400/80 overflow-auto max-h-16 text-left w-full">
          {error.message}
        </pre>
      )}
    </div>
  );
}
