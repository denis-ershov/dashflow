import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Inbox, Plus } from 'lucide-react';
import { commandBus } from '@/core/commands';
import { useTranslation, type TranslationKey } from '@/core/i18n';
import { itemRepository, ItemValidationError, SOURCE_TYPES, useItems } from '@/core/items';
import { REVEAL_WORKSPACE_ITEM } from '@/core/items/revealItem';
import { parseQuickCapture, QUICK_CAPTURE_LIMIT } from '@/core/items/quickParse';
import { ReminderList } from '@/features/reminders/ReminderList';
import { EmptyState, ErrorState, Skeleton } from '@/ui/feedback';
import { Button, Input } from '@/ui/primitives';
import { VIRTUAL_ROWS_THRESHOLD } from '@/ui/hooks/useVirtualRows';
import { InboxActionDialog } from './InboxActionDialog';
import { InboxRows, type InboxRowsHandle } from './InboxRows';
import {
  applyInboxAction,
  InboxBoardUnavailableError,
  type InboxAction,
  type InboxDialogView,
} from './inboxActions';

interface DialogTarget {
  view: InboxDialogView;
  ids: string[];
}

const shortcutByCode = { KeyJ: 'j', KeyK: 'k', KeyE: 'e', KeyT: 't' } as const;

function inboxShortcut(event: KeyboardEvent<HTMLElement>) {
  const { target, currentTarget } = event;
  if (
    !(target instanceof HTMLElement) ||
    !currentTarget.contains(target) ||
    target.isContentEditable ||
    target.closest('input, textarea, select') ||
    event.defaultPrevented ||
    event.nativeEvent.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return;
  }
  return /^[а-яё]$/iu.test(event.key) && Object.hasOwn(shortcutByCode, event.code)
    ? shortcutByCode[event.code as keyof typeof shortcutByCode]
    : event.key.toLowerCase();
}

export function InboxWidget() {
  const { t, tp, language } = useTranslation();
  const { items: allItems, loading, error, reload } = useItems(itemRepository, {
    status: 'inbox',
    sort: 'createdAt',
  });
  const [source, setSource] = useState('all');
  const items = useMemo(
    () => source === 'all' ? allItems : allItems.filter((item) => item.source.type === source),
    [allItems, source],
  );
  const idPrefix = useId();
  const rowId = useCallback((itemId: string) => `${idPrefix}-${itemId}`, [idPrefix]);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<InboxRowsHandle>(null);
  const focusAfterRemoval = useRef<{ id: string; index: number } | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<'capture' | 'action' | null>(null);
  const [input, setInput] = useState('');
  const [captureError, setCaptureError] = useState<TranslationKey>();
  const [actionError, setActionError] = useState<TranslationKey>();
  const [notice, setNotice] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [searchItem, setSearchItem] = useState<string>();
  const selectedIds = items.filter((item) => selected.has(item.id)).map((item) => item.id);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    setSelected((previous) => {
      const visible = new Set(Array.from(previous).filter((id) => visibleIds.has(id)));
      return visible.size === previous.size ? previous : visible;
    });
  }, [items]);

  useEffect(() => {
    const pending = focusAfterRemoval.current;
    if (!pending || dialog || items.some((item) => item.id === pending.id)) return;
    focusAfterRemoval.current = null;
    if (document.activeElement !== document.body) return;
    const next = items[Math.min(pending.index, items.length - 1)];
    if (!next || !rowsRef.current?.focusItem(next.id)) listRef.current?.focus();
  }, [dialog, items]);

  useLayoutEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const reveal = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const id: unknown = event.detail;
      if (typeof id === 'string') setSearchItem(id);
    };
    root.addEventListener(REVEAL_WORKSPACE_ITEM, reveal);
    return () => root.removeEventListener(REVEAL_WORKSPACE_ITEM, reveal);
  }, []);

  useEffect(() => {
    if (!searchItem || loading) return;
    if (!error && allItems.some(({ id }) => id === searchItem)) {
      if (!items.some(({ id }) => id === searchItem)) {
        setSource('all');
        return;
      }
      rowsRef.current?.focusItem(searchItem);
    }
    setSearchItem(undefined);
  }, [searchItem, allItems, items, loading, error]);

  const closeDialog = useCallback(() => {
    if (busyRef.current) return;
    setDialog(null);
    setActionError(undefined);
  }, []);

  const toggleItem = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const openDialog = (view: InboxDialogView, ids: string[]) => {
    setActionError(undefined);
    setDialog({ view, ids });
  };

  const capture = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || busyRef.current || error || loading) return;
    busyRef.current = true;
    setBusy('capture');
    setNotice(undefined);
    setCaptureError(undefined);
    try {
      const draft = parseQuickCapture(input, { locale: language });
      await commandBus.dispatch('item.create', { ...draft, kind: 'task', status: 'inbox' });
      setInput('');
      setNotice(t('inbox.captured'));
    } catch (reason) {
      setCaptureError(
        reason instanceof ItemValidationError ? 'inbox.captureInvalid' : 'inbox.editError',
      );
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const apply = async (action: InboxAction, ids: string[]) => {
    if (busyRef.current || ids.length === 0) return;
    busyRef.current = true;
    setBusy('action');
    setNotice(undefined);
    setActionError(undefined);
    const firstId = ids[0];
    if (
      firstId &&
      (action.type === 'delete' || action.type === 'archive' || action.type === 'move')
    ) {
      const index = items.findIndex((item) => item.id === firstId);
      if (index >= 0) focusAfterRemoval.current = { id: firstId, index };
    }
    try {
      const succeeded = new Set(await applyInboxAction(action, ids));
      if (firstId && !succeeded.has(firstId)) focusAfterRemoval.current = null;
      setSelected((previous) => new Set(Array.from(previous).filter((id) => !succeeded.has(id))));
      if (succeeded.size !== ids.length) {
        setActionError(succeeded.size === 0 ? 'inbox.editError' : 'inbox.partialError');
      }
      if (succeeded.size > 0) {
        setDialog(null);
        setNotice(tp('inbox.updated', succeeded.size));
      }
    } catch (reason) {
      focusAfterRemoval.current = null;
      setActionError(
        reason instanceof InboxBoardUnavailableError ? 'inbox.boardUnavailable' : 'inbox.editError',
      );
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (dialog || busyRef.current || items.length === 0 || error || loading) return;
    const shortcut = inboxShortcut(event);
    const edge = items.length > VIRTUAL_ROWS_THRESHOLD && (shortcut === 'home' || shortcut === 'end');
    if (!edge && shortcut !== 'j' && shortcut !== 'k' && shortcut !== 'e' && shortcut !== 't') return;
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-inbox-item]')?.dataset
      .inboxItem;
    if (edge && !listRef.current?.contains(event.target as Node)) return;
    const index = items.findIndex((item) => item.id === id);
    event.preventDefault();

    if (edge || shortcut === 'j' || shortcut === 'k') {
      const offset = shortcut === 'j' ? 1 : -1;
      const nextIndex =
        shortcut === 'home' ? 0 : shortcut === 'end' || (index < 0 && shortcut === 'k')
          ? items.length - 1
          : index + offset;
      const next = items[Math.max(0, Math.min(nextIndex, items.length - 1))];
      if (next) rowsRef.current?.focusItem(next.id);
      return;
    }
    if (event.repeat) return;
    const item = items[Math.max(0, index)];
    const ids = selectedIds.length > 0 ? selectedIds : item ? [item.id] : [];
    if (shortcut === 'e') void apply({ type: 'archive' }, ids);
    else openDialog('move', ids);
  };

  const unavailable = loading || Boolean(error);
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const dialogItems = dialog ? items.filter((item) => dialog.ids.includes(item.id)) : [];

  return (
    <section
      ref={sectionRef}
      data-search-reveal=""
      aria-label={t('widgets.inbox')}
      className="flex h-full min-h-0 min-w-0 flex-col gap-2 p-2 sm:p-3"
      onKeyDown={handleKeyDown}
    >
      <form
        className="flex min-w-0 shrink-0 items-start gap-2"
        onSubmit={(event) => void capture(event)}
      >
        <div className="min-w-0 flex-1">
          <Input
            aria-label={t('inbox.capture')}
            placeholder={t('inbox.example')}
            id={`${idPrefix}-capture`}
            value={input}
            maxLength={QUICK_CAPTURE_LIMIT}
            disabled={unavailable}
            readOnly={busy !== null}
            className="min-w-0"
            onChange={(event) => {
              setInput(event.target.value);
              setCaptureError(undefined);
            }}
            error={captureError ? t(captureError) : undefined}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          aria-label={t('common.add')}
          icon={<Plus aria-hidden="true" className="size-5" />}
          disabled={!input.trim() || unavailable || busy === 'action'}
          loading={busy === 'capture'}
        />
      </form>

      {!unavailable && (allItems.length > 0 || source !== 'all') && (
        <label className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 text-sm text-fg-muted">
          <span>{t('agents.sourceLabel')}</span>
          <select
            className="min-h-11 min-w-0 rounded-lg border border-line bg-canvas px-2 text-sm text-fg"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="all">{t('agents.sourceAll')}</option>
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>{t(`inbox.sources.${type}`)}</option>
            ))}
          </select>
        </label>
      )}

      {!unavailable && items.length > 0 && (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-2">
          <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 px-1 text-xs text-fg-muted">
            <input
              ref={(element) => {
                if (element) element.indeterminate = selectedIds.length > 0 && !allSelected;
              }}
              type="checkbox"
              className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label={t('inbox.selectAll')}
              checked={allSelected}
              disabled={busy !== null}
              onChange={(event) =>
                setSelected(new Set(event.target.checked ? items.map((item) => item.id) : []))
              }
            />
            <span>
              {selectedIds.length > 0
                ? tp('inbox.selected', selectedIds.length)
                : t('inbox.selectAll')}
            </span>
          </label>
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              aria-haspopup="dialog"
              disabled={busy !== null}
              onClick={() => openDialog('actions', selectedIds)}
            >
              {t('inbox.actions')}
            </Button>
          )}
        </div>
      )}

      <p role="status" className="sr-only">
        {notice}
      </p>
      {!dialog && actionError && (
        <p role="alert" className="text-xs text-danger">
          {t(actionError)}
        </p>
      )}
      <div
        ref={listRef}
        role="region"
        aria-label={t('inbox.list')}
        aria-keyshortcuts={items.length > VIRTUAL_ROWS_THRESHOLD ? 'J K E T Home End' : 'J K E T'}
        aria-busy={loading}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl pe-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <ReminderList />
        {error ? (
          <ErrorState
            message={t(error.name === 'SecurityError' ? 'inbox.accessError' : 'inbox.loadError')}
            onRetry={reload}
          />
        ) : loading ? (
          <div className="space-y-2" role="status" aria-label={t('common.loading')}>
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('inbox.empty')}
            icon={<Inbox aria-hidden="true" className="size-8" />}
          />
        ) : (
          <InboxRows
            ref={rowsRef}
            scrollRef={listRef}
            items={items}
            rowId={rowId}
            selectedIds={selected}
            disabled={busy !== null}
            onToggle={toggleItem}
            onActions={(id) => openDialog('actions', [id])}
            dialogItem={dialog?.ids[0]}
          />
        )}
      </div>

      {dialog && (
        <InboxActionDialog
          items={dialogItems}
          view={dialog.view}
          busy={busy === 'action'}
          apply={(action) => void apply(action, dialog.ids)}
          error={actionError ? t(actionError) : undefined}
          onView={(view) => openDialog(view, dialog.ids)}
          onClose={closeDialog}
        />
      )}
    </section>
  );
}
