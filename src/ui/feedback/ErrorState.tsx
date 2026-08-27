import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Произошла ошибка',
  message,
  onRetry,
  retryLabel = 'Попробовать снова',
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-danger/20 bg-danger/5 text-fg',
        className,
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-fg mb-1">{title}</h3>
      {message && <p className="text-sm text-fg-muted max-w-sm mb-6">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
