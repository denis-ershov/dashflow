import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/ui/feedback/Skeleton';

describe('Skeleton', () => {
  it('рендерит плейсхолдер с aria-hidden="true"', () => {
    const { container } = render(<Skeleton className="w-24 h-4" />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-surface-hover');
  });
});
