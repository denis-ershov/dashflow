import { Bot, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useTranslation } from '@/core/i18n';
import type { Item } from '@/core/items';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives';

export const cardDropId = (id: string) => `item:${id}`;

export function CardMetadata({ item }: { item: Item }) {
  const { formatDate, t } = useTranslation();
  const due = item.dueAt ? new Date(item.dueAt) : undefined;
  const overdue = Boolean(due && due.getTime() < Date.now() && item.status !== 'done');

  const agent = item.source.type === 'agent' ? item.source.name : undefined;
  if (!due && !item.priority && !agent && item.tags.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-2 text-xs text-fg-muted">
      {agent && (
        <span className="inline-flex min-w-0 items-center gap-1 wrap-anywhere">
          <Bot aria-hidden="true" className="size-4 shrink-0" />
          {t('inbox.namedSource', { type: t('inbox.sources.agent'), name: agent })}
        </span>
      )}
      {item.priority && <span>{t(`kanban.priority.${item.priority}`)}</span>}
      {due && (
        <time dateTime={item.dueAt} className={cn(overdue && 'font-medium text-danger')}>
          {t(overdue ? 'kanban.overdue' : 'kanban.due', {
            date: formatDate(due, { dateStyle: 'medium', timeStyle: 'short' }),
          })}
        </time>
      )}
      {item.tags.map((tag) => (
        <span key={tag} className="max-w-full rounded-lg bg-surface px-2 py-0.5 wrap-anywhere">
          {tag}
        </span>
      ))}
    </div>
  );
}

interface KanbanCardProps {
  item: Item;
  disabled: boolean;
  dragging: boolean;
  instructionsId: string;
  onOpen: () => void;
  onDragKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  position?: number;
  count?: number;
  style?: CSSProperties;
}

export function KanbanCard({
  item,
  disabled,
  dragging,
  instructionsId,
  onOpen,
  onDragKey,
  onBlur,
  position,
  count,
  style,
}: KanbanCardProps) {
  const { t } = useTranslation();
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useSortable({
    id: cardDropId(item.id),
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      data-kanban-row={item.id}
      data-virtual-row={style ? item.id : undefined}
      aria-posinset={position}
      aria-setsize={count}
      style={style}
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start rounded-sm border border-line border-s-2 bg-canvas p-1 shadow-sm',
        item.priority === 'high'
          ? 'border-s-danger'
          : item.priority === 'medium'
            ? 'border-s-warning'
            : 'border-s-transparent',
        (isDragging || dragging) && 'border-primary border-s-primary bg-primary/10',
      )}
    >
      <Button
        variant="ghost"
        className="justify-start px-2 text-start font-semibold wrap-anywhere"
        aria-haspopup="dialog"
        data-kanban-action="open"
        data-kanban-item={item.id}
        onClick={onOpen}
      >
        {item.title}
      </Button>
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon"
        className="touch-none cursor-grab text-fg-muted active:cursor-grabbing"
        aria-label={t('kanban.drag', { title: item.title })}
        aria-describedby={instructionsId}
        aria-keyshortcuts="Space ArrowUp ArrowDown ArrowLeft ArrowRight Home End Escape"
        aria-pressed={dragging || isDragging}
        aria-disabled={disabled}
        data-kanban-action="drag"
        data-kanban-item={item.id}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0) return;
          // Chrome может прокрутиться к полю ввода, когда сенсор очищает выделение.
          event.currentTarget.focus({ preventScroll: true });
          listeners?.onPointerDown?.(event);
        }}
        onKeyDown={onDragKey}
        onBlur={onBlur}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </Button>
      <div className="col-span-2 min-w-0 empty:hidden px-2 pb-2">
        <CardMetadata item={item} />
      </div>
    </li>
  );
}
