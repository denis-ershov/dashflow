import { useEffect, useState, type FormEvent } from 'react';
import { Archive, Bell, CalendarDays, ListTodo, Trash2 } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { itemRepository, subscribeItemsChanged, type Board, type Item } from '@/core/items';
import {
  requestReminderNotificationsOnce,
  shouldOfferReminderNotifications,
} from '@/core/reminders/notificationConsent';
import { ErrorState, Spinner } from '@/ui/feedback';
import { Modal } from '@/ui/overlays/Modal';
import { Button, Input, Select } from '@/ui/primitives';
import {
  isTaskBoard,
  type InboxAction,
  type InboxDateField,
  type InboxDialogView,
} from './inboxActions';
import { parseDateTimeInput, toDateTimeInput } from './inboxDates';

type BoardState = { state: 'loading' | 'error' } | { state: 'ready'; boards: Board[] };

interface ActionFormProps {
  busy: boolean;
  apply: (action: InboxAction) => void;
}

function InboxMoveForm({ busy, apply }: ActionFormProps) {
  const { t } = useTranslation();
  const [boardId, setBoardId] = useState('');
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<BoardState>({ state: 'loading' });

  useEffect(() => {
    let revision = 0;
    let disposed = false;
    const load = async () => {
      const current = ++revision;
      try {
        const boards = await itemRepository.listBoards();
        if (!disposed && current === revision) {
          setResult({ state: 'ready', boards: boards.filter(isTaskBoard) });
        }
      } catch {
        if (!disposed && current === revision) setResult({ state: 'error' });
      }
    };
    const stop = subscribeItemsChanged((event) => {
      if (event.boards) void load();
    });
    void load();
    return () => {
      disposed = true;
      stop();
    };
  }, [request]);

  if (result.state === 'loading') return <Spinner />;
  if (result.state === 'error') {
    return (
      <ErrorState
        message={t('inbox.boardLoadError')}
        onRetry={() => {
          setResult({ state: 'loading' });
          setRequest((value) => value + 1);
        }}
      />
    );
  }
  if (!('boards' in result) || result.boards.length === 0) {
    return <p className="text-sm text-fg-muted">{t('inbox.noBoards')}</p>;
  }

  const selected = result.boards.some((board) => board.id === boardId) ? boardId : '';
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected && !busy) apply({ type: 'move', boardId: selected });
      }}
    >
      <Select
        label={t('inbox.board')}
        value={selected}
        onChange={(event) => setBoardId(event.target.value)}
        disabled={busy}
        required
        options={[
          { value: '', label: t('inbox.chooseBoard'), disabled: true },
          ...result.boards.map((board) => ({ value: board.id, label: board.title })),
        ]}
      />
      <Button type="submit" disabled={!selected} loading={busy} className="w-full">
        {t('inbox.move')}
      </Button>
    </form>
  );
}

function InboxDateForm({
  field,
  items,
  busy,
  apply,
  onClose,
}: ActionFormProps & { field: InboxDateField; items: Item[]; onClose: () => void }) {
  const { t } = useTranslation();
  const firstDate = items[0]?.[field];
  const sameDate = firstDate && items.every((item) => item[field] === firstDate);
  const current = sameDate ? toDateTimeInput(new Date(firstDate)) : '';
  const [value, setValue] = useState(current);
  const [invalid, setInvalid] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const offerNotifications = field === 'remindAt' && shouldOfferReminderNotifications();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || requesting) return;
    const iso = parseDateTimeInput(value);
    if (!iso) {
      setInvalid(true);
      return;
    }
    if (current === value) {
      onClose();
      return;
    }
    if (offerNotifications) {
      setRequesting(true);
      await requestReminderNotificationsOnce();
      setRequesting(false);
    }
    apply({ type: field, at: iso });
  };

  return (
    <form className="space-y-3" onSubmit={(event) => void submit(event)}>
      <Input
        type="datetime-local"
        label={t('inbox.date')}
        value={value}
        className="min-w-0"
        onChange={(event) => {
          setValue(event.target.value);
          setInvalid(false);
        }}
        disabled={busy || requesting}
        error={invalid ? t('inbox.invalidDate') : undefined}
        required
      />
      {offerNotifications && (
        <p className="text-sm text-fg-muted">{t('reminders.notificationPrompt')}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {items.some((item) => item[field]) && (
          <Button
            variant="ghost"
            disabled={busy || requesting}
            onClick={() => apply({ type: field, at: null })}
          >
            {t('inbox.clearDate')}
          </Button>
        )}
        <Button type="submit" loading={busy || requesting} disabled={!value}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

interface InboxActionDialogProps extends ActionFormProps {
  items: Item[];
  view: InboxDialogView;
  error?: string;
  onView: (view: InboxDialogView) => void;
  onClose: () => void;
}

export function InboxActionDialog({
  items,
  view,
  error,
  busy,
  onView,
  onClose,
  apply,
}: InboxActionDialogProps) {
  const { t, tp } = useTranslation();
  const titles = {
    actions: t('inbox.actions'),
    move: t('inbox.move'),
    dueAt: t('inbox.schedule'),
    remindAt: t('inbox.remind'),
  };
  const actions = [
    { id: 'move', Icon: ListTodo, onClick: () => onView('move') },
    { id: 'dueAt', Icon: CalendarDays, onClick: () => onView('dueAt') },
    { id: 'remindAt', Icon: Bell, onClick: () => onView('remindAt') },
    { id: 'archive', Icon: Archive, onClick: () => apply({ type: 'archive' }) },
    { id: 'delete', Icon: Trash2, onClick: () => apply({ type: 'delete' }) },
  ] as const;
  const formProps = { busy, apply };

  return (
    <Modal isOpen onClose={onClose} title={titles[view]} maxWidth="sm">
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('inbox.missing')}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted wrap-anywhere" dir="auto">
            {items.length === 1 ? items[0]?.title : tp('inbox.selected', items.length)}
          </p>
          {view === 'actions' ? (
            <div className="flex flex-col gap-1">
              {actions.map(({ id, Icon, onClick }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-start"
                  disabled={busy}
                  onClick={onClick}
                  icon={<Icon aria-hidden="true" className="size-4" />}
                >
                  {id === 'archive' || id === 'delete' ? t(`inbox.${id}`) : titles[id]}
                </Button>
              ))}
            </div>
          ) : view === 'move' ? (
            <InboxMoveForm {...formProps} />
          ) : (
            <InboxDateForm key={view} field={view} items={items} onClose={onClose} {...formProps} />
          )}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
