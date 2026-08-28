import { cn } from '@/ui/lib/cn';
import type { RssCardStyle, RssBorderRadius } from './types';

export interface RssStyleOptions {
  cardStyle?: RssCardStyle;
  borderRadius?: RssBorderRadius;
}

export function getRssCardClasses({
  cardStyle = 'glass',
  borderRadius = 'md',
}: RssStyleOptions): {
  cardClass: string;
  badgeClass: string;
} {
  let bgClass = 'bg-surface/60 backdrop-blur-md border-line/60 hover:bg-surface/90 hover:border-primary/50';
  if (cardStyle === 'solid') {
    bgClass = 'bg-surface border-line hover:bg-surface-hover hover:border-primary/50 shadow-1';
  } else if (cardStyle === 'outline') {
    bgClass = 'bg-transparent border-line/80 hover:border-primary/70 hover:bg-surface/30';
  } else if (cardStyle === 'transparent') {
    bgClass = 'bg-transparent border-transparent hover:bg-surface/40 hover:border-line/40';
  }

  let radiusClass = 'rounded-xl';
  if (borderRadius === 'none') radiusClass = 'rounded-none';
  if (borderRadius === 'sm') radiusClass = 'rounded-lg';
  if (borderRadius === 'lg') radiusClass = 'rounded-2xl';

  const cardClass = cn(
    'group/item relative flex flex-col p-3 transition-all duration-200 ease-out border cursor-pointer select-none',
    bgClass,
    radiusClass,
    'hover:-translate-y-0.5 hover:shadow-2 active:scale-[0.99]',
  );

  const badgeClass = cn(
    'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-hover/80 border border-line/50 text-fg-muted truncate max-w-[140px]',
  );

  return { cardClass, badgeClass };
}
