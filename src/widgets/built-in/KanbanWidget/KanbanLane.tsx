import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from '@/core/i18n';
import type { Item } from '@/core/items';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives';
import { useVirtualRows, VIRTUAL_ROWS_THRESHOLD } from '@/ui/hooks/useVirtualRows';
import { cardDropId } from './KanbanCard';
import type { Lane } from './kanbanOrder';

export const laneDropId = (id: string) => `column:${id}`;

export type KanbanFocusAction = 'open' | 'drag';

export interface KanbanLaneApi {
  focusItem: (id: string, action: KanbanFocusAction) => boolean;
  reveal: (id: string) => void;
  insertionAt: (clientY: number) => number | undefined;
}

interface KanbanLaneProps {
  lane: Lane;
  headingId: string;
  collapsed: boolean;
  highlighted: boolean;
  onToggle: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  pinnedItem?: string;
  onApi: (id: string, api?: KanbanLaneApi) => void;
  renderCard: (item: Item, position?: number, style?: CSSProperties) => ReactNode;
}

export function KanbanLane({
  lane,
  headingId,
  collapsed,
  highlighted,
  onToggle,
  scrollRef,
  pinnedItem,
  onApi,
  renderCard,
}: KanbanLaneProps) {
  const { t, tp, formatNumber } = useTranslation();
  const { column, items } = lane;
  const { isOver, setNodeRef } = useDroppable({
    id: laneDropId(column.id),
    disabled: !lane.configured,
  });
  const count = items.length;
  const virtual = count > VIRTUAL_ROWS_THRESHOLD;
  const rows = useMemo(
    () => virtual ? items.map(({ id, tags, dueAt, priority, source }) => ({
      key: id, estimate: tags.length || dueAt || priority || source.type === 'agent' ? 91 : 62, gap: 8,
    })) : [],
    [items, virtual],
  );
  const [focused, setFocused] = useState<string>();
  const [pending, setPending] = useState<{ id: string; action: KanbanFocusAction }>();
  const window = useVirtualRows({
    rows, scrollRef, enabled: virtual && !collapsed, pinned: [pinnedItem, focused, pending?.id],
  });
  const rendered = virtual
    ? window.range.flatMap((index) => items[index] ? [{ item: items[index], index }] : [])
    : items.map((item, index) => ({ item, index }));
  function button(id: string, action: KanbanFocusAction) {
    return window.listRef.current?.querySelector<HTMLButtonElement>(
      `[data-kanban-item="${CSS.escape(id)}"][data-kanban-action="${action}"]`,
    );
  }
  function focusItem(id: string, action: KanbanFocusAction) {
    if (collapsed || !items.some((item) => item.id === id)) return false;
    if (virtual) {
      window.reveal(id);
      setPending({ id, action });
    } else {
      button(id, action)?.focus();
    }
    return true;
  }
  useLayoutEffect(() => {
    onApi(column.id, {
      focusItem,
      reveal: (id) => {
        if (collapsed) return;
        if (virtual) window.reveal(id);
        else button(id, 'open')?.scrollIntoView?.({ block: 'nearest' });
      },
      insertionAt: window.insertionAt,
    });
    return () => onApi(column.id);
  });
  const { listRef, reveal } = window;
  useLayoutEffect(() => {
    if (!pending || collapsed) return;
    const target = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-kanban-item="${CSS.escape(pending.id)}"][data-kanban-action="${pending.action}"]`,
    );
    if (!target) return;
    reveal(pending.id);
    target.focus({ preventScroll: true });
    setPending(undefined);
  }, [pending, collapsed, listRef, reveal, window.range]);

  function navigate(event: KeyboardEvent<HTMLUListElement>) {
    if (!virtual || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        event.shiftKey || !(event.target instanceof HTMLElement)) return;
    const id = event.target.closest<HTMLElement>('[data-kanban-row]')?.dataset.kanbanRow;
    const current = items.findIndex((item) => item.id === id);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : event.key === 'ArrowDown' ? Math.min(count - 1, current + 1)
      : event.key === 'ArrowUp' ? (current < 0 ? count - 1 : Math.max(0, current - 1))
      : undefined;
    if (next === undefined) return;
    const item = items[next];
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    focusItem(item.id, event.target.dataset.kanbanAction === 'drag' ? 'drag' : 'open');
  }
  const full = column.wipLimit !== undefined && count >= column.wipLimit;
  const exceeding = column.wipLimit !== undefined && count > column.wipLimit;
  const title = lane.configured ? column.title : t('kanban.unknownColumn', { status: column.id });
  const Chevron = collapsed ? ChevronDown : ChevronUp;

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        'min-w-0 rounded-xl border border-line bg-surface/60 p-2',
        (isOver || highlighted) && 'border-primary ring-1 ring-primary/40',
      )}
    >
      <header className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 ps-1">
          <h3 id={headingId} className="text-sm font-semibold text-fg wrap-anywhere">
            {title}
          </h3>
          <p
            className={cn(
              'text-xs text-fg-muted',
              full && 'text-warning',
              exceeding && 'text-danger',
            )}
          >
            {column.wipLimit === undefined
              ? tp('kanban.cards', count, { count: formatNumber(count) })
              : t(exceeding ? 'kanban.wipOver' : 'kanban.wip', {
                  count: formatNumber(count),
                  limit: formatNumber(column.wipLimit),
                })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t(collapsed ? 'kanban.expand' : 'kanban.collapse', { column: title })}
          aria-expanded={!collapsed}
          aria-controls={`${headingId}-cards`}
          onClick={onToggle}
        >
          <Chevron aria-hidden="true" className="size-4" />
        </Button>
      </header>
      <div id={`${headingId}-cards`} hidden={collapsed} className="mt-2">
        {items.length > 0 ? (!collapsed || !virtual) && (
          <SortableContext
            items={rendered.map(({ item }) => cardDropId(item.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul
              ref={window.listRef}
              style={window.listStyle}
              className={virtual ? undefined : 'space-y-2'}
              aria-labelledby={virtual ? headingId : undefined}
              aria-keyshortcuts={virtual ? 'ArrowUp ArrowDown Home End' : undefined}
              tabIndex={virtual ? 0 : undefined}
              onKeyDown={navigate}
              onFocusCapture={virtual ? (event) => setFocused(
                (event.target as HTMLElement).closest<HTMLElement>('[data-kanban-row]')?.dataset.kanbanRow,
              ) : undefined}
              onBlurCapture={virtual ? (event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined);
              } : undefined}
            >
              {rendered.map(({ item, index }) =>
                renderCard(item, virtual ? index + 1 : undefined, window.rowStyle(index)),
              )}
            </ul>
          </SortableContext>
        ) : (
          <p className="grid min-h-20 place-items-center rounded-xl border border-dashed border-line px-2 text-center text-xs text-fg-muted">
            {t('kanban.emptyColumn')}
          </p>
        )}
      </div>
    </section>
  );
}
