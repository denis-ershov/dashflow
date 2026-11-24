import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from '@/core/i18n';
import type { Item } from '@/core/items';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives';
import { cardDropId } from './KanbanCard';
import type { Lane } from './kanbanOrder';

export const laneDropId = (id: string) => `column:${id}`;

interface KanbanLaneProps {
  lane: Lane;
  headingId: string;
  collapsed: boolean;
  highlighted: boolean;
  onToggle: () => void;
  renderCard: (item: Item) => ReactNode;
}

export function KanbanLane({
  lane,
  headingId,
  collapsed,
  highlighted,
  onToggle,
  renderCard,
}: KanbanLaneProps) {
  const { t, tp, formatNumber } = useTranslation();
  const { column, items } = lane;
  const { isOver, setNodeRef } = useDroppable({
    id: laneDropId(column.id),
    disabled: !lane.configured,
  });
  const count = items.length;
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
        {items.length > 0 ? (
          <SortableContext
            items={items.map((item) => cardDropId(item.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">{items.map(renderCard)}</ul>
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
