import { useMemo } from 'react';
import { Bell, Bot, CalendarDays, Ellipsis, FileInput, Flag, Plug, UserRound } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import type { Item, ItemSourceType } from '@/core/items';
import { Button } from '@/ui/primitives';
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
}

function InboxRow({ item, id, selected, disabled, onToggle, onActions }: InboxRowProps) {
  const { t } = useTranslation();

  return (
    <li
      id={id}
      data-inbox-item={item.id}
      data-search-item={item.id}
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

type InboxRowsProps = Omit<InboxRowProps, 'item' | 'id' | 'selected'> & {
  items: Item[];
  rowId: (itemId: string) => string;
  selectedIds: ReadonlySet<string>;
};

export function InboxRows({ items, rowId, selectedIds, ...rowProps }: InboxRowsProps) {
  const { formatDate } = useTranslation();
  const groups = useMemo(() => groupByLocalDay(items), [items]);

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
