import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from '@/core/i18n';
import { cn } from '@/ui/lib/cn';
import { RssArticleCard, type ArticleAppearance } from './RssArticleCard';
import type { RssItem, RssViewMode } from './types';

const VIRTUAL_THRESHOLD = 100;
const OVERSCAN = 5;
const ROW_SIZE: Record<RssViewMode, number> = {
  compact: 76,
  thumbnails: 132,
  cards: 260,
  grid: 122,
  magazine: 122,
};
const HERO_EXTRA = 138;

interface Props extends ArticleAppearance {
  items: readonly RssItem[];
  readIds: ReadonlySet<string>;
  onOpen: (item: RssItem) => void;
}

/** Рендерит видимые строки и запас для прокрутки с клавиатуры и касанием. */
export function RssArticleList({ items, readIds, onOpen, ...appearance }: Props) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const targetFocus = useRef<number | undefined>(undefined);
  const [viewport, setViewport] = useState({ width: 0, height: 360 });
  const [top, setTop] = useState(0);
  const virtual = items.length > VIRTUAL_THRESHOLD;
  const columns = appearance.viewMode === 'grid' && viewport.width >= 500 ? 2 : 1;
  const rowHeight = ROW_SIZE[appearance.viewMode];
  const heroExtra = appearance.viewMode === 'magazine' && appearance.showThumbnails && items[0]?.thumbnail
    ? HERO_EXTRA : 0;

  useLayoutEffect(() => {
    const container = root.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        setViewport({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (targetFocus.current === undefined) return;
    const next = root.current?.querySelector<HTMLButtonElement>(`[data-rss-position="${targetFocus.current}"]`);
    if (next) {
      targetFocus.current = undefined;
      next.focus({ preventScroll: true });
    }
  });

  const rowCount = Math.ceil(items.length / columns);
  const offset = (row: number) => row * rowHeight + (row > 0 ? heroExtra : 0);
  const startRow = Math.min(
    Math.max(0, rowCount - 1),
    Math.max(0, Math.floor((top - heroExtra) / rowHeight) - OVERSCAN),
  );
  const stopRow = Math.min(rowCount, Math.ceil((top + viewport.height) / rowHeight) + OVERSCAN);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!virtual || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        !(event.target instanceof HTMLButtonElement)) return;
    const index = Number(event.target.dataset.rssPosition);
    const container = root.current;
    if (!container || !Number.isInteger(index)) return;
    const rowIndex = Math.floor(index / columns);
    const direction = event.key === 'ArrowUp' ? -columns : event.key === 'ArrowDown' ? columns : 0;
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : direction ? Math.max(0, Math.min(items.length - 1, index + direction)) : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const nextRow = Math.floor(nextIndex / columns);
    const nextScroll = nextRow !== rowIndex ? offset(nextRow) : container.scrollTop;
    const button = container.querySelector<HTMLButtonElement>(`[data-rss-position="${nextIndex}"]`);
    if (button) {
      button.focus();
      return;
    }
    targetFocus.current = nextIndex;
    container.scrollTop = nextScroll;
    setTop(container.scrollTop);
  };

  const card = (item: RssItem, index: number) => (
    <RssArticleCard
      key={`${item.feedId ?? ''}:${item.id}`}
      item={item}
      index={index}
      count={items.length}
      unread={!readIds.has(item.id)}
      onOpen={onOpen}
      {...appearance}
    />
  );
  const grid = cn('grid min-w-0 gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-1');

  return (
    <div
      ref={root}
      role="list"
      aria-label={t('rss.articleList')}
      aria-keyshortcuts={virtual ? 'ArrowUp ArrowDown Home End' : undefined}
      className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain pe-1"
      onScroll={(event) => setTop(event.currentTarget.scrollTop)}
      onKeyDown={moveFocus}
    >
      {virtual ? (
        <>
          <div role="presentation" style={{ height: offset(startRow) }} />
          {Array.from({ length: stopRow - startRow }, (_, position) => {
            const row = startRow + position;
            const index = row * columns;
            return (
              <div
                role="presentation"
                key={row}
                className={cn(grid, 'items-start overflow-hidden pb-2')}
                style={{ height: offset(row + 1) - offset(row) }}
              >
                {items.slice(index, index + columns).map((item, part) => card(item, index + part))}
              </div>
            );
          })}
          <div role="presentation" style={{ height: offset(rowCount) - offset(stopRow) }} />
        </>
      ) : (
        <div role="presentation" className={grid}>{items.map(card)}</div>
      )}
    </div>
  );
}
