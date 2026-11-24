import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Bell, Bot, CalendarDays, Ellipsis, FileInput, Flag, Plug, UserRound } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import type { Item, ItemSourceType } from '@/core/items';
import { Button } from '@/ui/primitives';
import { useVirtualRows, VIRTUAL_ROWS_THRESHOLD } from '@/ui/hooks/useVirtualRows';
import { groupByLocalDay } from './inboxDates';

const SOURCE_ICONS = {
  user: UserRound,
  agent: Bot,
  connector: Plug,
  import: FileInput,
} satisfies Record<ItemSourceType, typeof UserRound>;

const dayFormat: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
};

function InboxMetadata({ item }: { item: Item }) {
  const { t, formatDate } = useTranslation();
  const sourceType = t(`inbox.sources.${item.source.type}`);
  const source =
    item.source.type !== 'user' && item.source.name
      ? t('inbox.namedSource', { type: sourceType, name: item.source.name })
      : sourceType;
  const SourceIcon = SOURCE_ICONS[item.source.type];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted wrap-anywhere">
      <span className="inline-flex min-w-0 items-center gap-1">
        <SourceIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <span>{source}</span>
      </span>
      {item.dueAt && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            {t('inbox.dueAt')}{' '}
            <time dateTime={item.dueAt}>{formatDate(new Date(item.dueAt), dateTimeFormat)}</time>
          </span>
        </span>
      )}
      {item.remindAt && (
        <span className="inline-flex items-center gap-1">
          <Bell aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            {t('inbox.remindAt')}{' '}
            <time dateTime={item.remindAt}>
              {formatDate(new Date(item.remindAt), dateTimeFormat)}
            </time>
          </span>
        </span>
      )}
      {item.tags.map((tag) => (
        <span key={tag} className="min-w-0 rounded-md border border-line px-1.5 py-0.5">
          #{tag}
        </span>
      ))}
    </div>
  );
}

interface InboxRowProps {
  item: Item;
  id: string;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  onActions: (id: string) => void;
  position?: number;
  count?: number;
  style?: CSSProperties;
}

function InboxRow({ item, id, selected, disabled, onToggle, onActions, position, count, style }: InboxRowProps) {
  const { t } = useTranslation();

  return (
    <li
      id={id}
      data-inbox-item={item.id}
      data-search-item={item.id}
      data-virtual-row={style ? item.id : undefined}
      aria-posinset={position}
      aria-setsize={count}
      style={style}
      tabIndex={-1}
      className="flex min-w-0 items-start rounded-xl border border-line bg-surface/60 p-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary has-checked:border-primary/60"
    >
      <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          aria-label={t('inbox.selectItem', { title: item.title })}
          className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          checked={selected}
          disabled={disabled}
          onChange={() => onToggle(item.id)}
        />
      </label>
      <div className="min-w-0 flex-1 py-2 pe-1">
        <div className="mb-1 flex min-w-0 items-baseline gap-1.5">
          <p dir="auto" className="min-w-0 text-sm font-semibold text-fg wrap-anywhere">
            {item.title}
          </p>
          {item.priority === 'high' && (
            <Flag
              role="img"
              aria-label={t('inbox.highPriority')}
              className="size-3.5 shrink-0 self-center text-warning"
            />
          )}
        </div>
        <InboxMetadata item={item} />
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-fg-muted"
        aria-label={t('inbox.itemActions', { title: item.title })}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => onActions(item.id)}
        icon={<Ellipsis aria-hidden="true" className="size-5" />}
      />
    </li>
  );
}

export interface InboxRowsHandle {
  focusItem: (id: string) => boolean;
}

type InboxRowsProps = Omit<InboxRowProps, 'item' | 'id' | 'selected' | 'position' | 'count' | 'style'> & {
  items: Item[];
  rowId: (itemId: string) => string;
  selectedIds: ReadonlySet<string>;
  scrollRef: RefObject<HTMLDivElement | null>;
  ref: RefObject<InboxRowsHandle | null>;
  dialogItem?: string;
};

export function InboxRows({ items, rowId, selectedIds, scrollRef, ref, dialogItem, ...rowProps }: InboxRowsProps) {
  const { formatDate, t } = useTranslation();
  const groups = useMemo(() => groupByLocalDay(items), [items]);
  const virtual = items.length > VIRTUAL_ROWS_THRESHOLD;
  const entries = useMemo(() => {
    if (!virtual) return [];
    let position = 0;
    return Array.from(groups).flatMap(([day, group]) => [
      { key: `day:${day}`, day, date: group.date, estimate: 25, gap: 4, type: 'day' as const },
      ...group.items.map((item) => ({
        key: item.id, item, position: ++position, estimate: 67, gap: 6, type: 'item' as const,
      })),
    ]);
  }, [groups, virtual]);
  const [focused, setFocused] = useState<string>();
  const [pending, setPending] = useState<string>();
  const rows = useVirtualRows({ rows: entries, scrollRef, enabled: virtual, pinned: [focused, pending, dialogItem] });

  useImperativeHandle(ref, () => ({
    focusItem(id) {
      if (!items.some((item) => item.id === id)) return false;
      if (virtual) {
        rows.reveal(id);
        setPending(id);
      } else {
        document.getElementById(rowId(id))?.focus();
      }
      return true;
    },
  }));

  const revealRow = rows.reveal;
  useLayoutEffect(() => {
    if (!pending) return;
    const node = document.getElementById(rowId(pending));
    if (!node) return;
    revealRow(pending);
    node.focus({ preventScroll: true });
    setPending(undefined);
  }, [pending, rowId, revealRow, rows.range]);

  if (virtual) return (
    <ul
      ref={rows.listRef}
      style={rows.listStyle}
      aria-label={t('inbox.list')}
      onFocusCapture={(event) => setFocused((event.target as HTMLElement).closest<HTMLElement>('[data-inbox-item]')?.dataset.inboxItem)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined);
      }}
    >
      {rows.range.map((index) => {
        const entry = entries[index];
        if (!entry) return null;
        const style = rows.rowStyle(index);
        if (entry.type === 'day') return (
          <li key={entry.key} role="presentation" style={style} data-virtual-row={entry.key}>
            <h4 className="px-1 text-xs font-semibold text-fg-muted">
              <time dateTime={entry.day}>{formatDate(entry.date, dayFormat)}</time>
            </h4>
          </li>
        );
        return <InboxRow
          key={entry.key}
          item={entry.item}
          id={rowId(entry.key)}
          selected={selectedIds.has(entry.key)}
          position={entry.position}
          count={items.length}
          style={style}
          {...rowProps}
        />;
      })}
    </ul>
  );

  return (
    <div className="space-y-3">
      {Array.from(groups, ([day, group]) => (
        <section key={day} aria-labelledby={rowId(day)}>
          <h4 id={rowId(day)} className="mb-1 px-1 text-xs font-semibold text-fg-muted">
            <time dateTime={day}>{formatDate(group.date, dayFormat)}</time>
          </h4>
          <ul className="space-y-1.5">
            {group.items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                id={rowId(item.id)}
                selected={selectedIds.has(item.id)}
                {...rowProps}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
