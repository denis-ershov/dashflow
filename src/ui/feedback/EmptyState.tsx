import React from 'react';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives/Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-line bg-surface/30',
        className,
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-surface border border-line text-fg-muted mb-4">
        {icon ?? <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-fg mb-1">{title}</h3>
      {description && <p className="text-sm text-fg-muted max-w-sm mb-6">{description}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
