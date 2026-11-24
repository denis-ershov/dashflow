import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import type { KeyboardEvent } from 'react';
import { useTranslation } from '@/core/i18n';
import type { Item } from '@/core/items';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives';

export const cardDropId = (id: string) => `item:${id}`;

export function CardMetadata({ item }: { item: Item }) {
  const { formatDate, t } = useTranslation();
  const due = item.dueAt ? new Date(item.dueAt) : undefined;
  const overdue = Boolean(due && due.getTime() < Date.now() && item.status !== 'done');

  if (!due && !item.priority && item.tags.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-2 text-xs text-fg-muted">
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
}

export function KanbanCard({
  item,
  disabled,
  dragging,
  instructionsId,
  onOpen,
  onDragKey,
  onBlur,
}: KanbanCardProps) {
  const { t } = useTranslation();
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useSortable({
    id: cardDropId(item.id),
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start rounded-xl border border-line bg-canvas p-1 shadow-sm',
        (isDragging || dragging) && 'border-primary bg-primary/5',
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
        aria-keyshortcuts="Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
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
