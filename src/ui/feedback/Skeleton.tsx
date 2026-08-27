import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-surface-hover rounded-md', className)}
      {...props}
    />
  );
};
