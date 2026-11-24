import { useId, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { LOCAL_USER_SOURCE } from '@/core/commands';
import { useTranslation } from '@/core/i18n';
import { itemRepository, type Item } from '@/core/items';
import {
  applyReminderAction,
  reminderTime,
  type ReminderOccurrence,
} from '@/core/reminders/reminder';
import { ErrorState, Spinner } from '@/ui/feedback';
import { Button } from '@/ui/primitives';
import { useDueReminders } from './useDueReminders';

function ReminderRow({ item }: { item: Item }) {
  const { t, formatDate } = useTranslation();
  const [busy, setBusy] = useState<'complete' | 'snooze' | null>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState(false);
  const at = reminderTime(item);
  const act = async (action: 'complete' | 'snooze') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    setError(false);
    try {
      const updated = await applyReminderAction(
        { repository: itemRepository, source: LOCAL_USER_SOURCE },
        { itemId: item.id, at },
        action,
      );
      setError(!updated);
    } catch {
      setError(true);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  return (
    <li className="min-w-0 space-y-2 rounded-xl border border-line p-3">
      <div className="flex items-start gap-2">
        <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="wrap-anywhere text-sm font-medium" dir="auto">
            {item.title}
          </p>
          <time className="text-xs text-fg-muted" dateTime={item.remindAt}>
            {formatDate(at, { dateStyle: 'medium', timeStyle: 'short' })}
          </time>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy !== null}
          loading={busy === 'complete'}
          onClick={() => void act('complete')}
        >
          {t('reminders.complete')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          loading={busy === 'snooze'}
          onClick={() => void act('snooze')}
        >
          {t('reminders.snooze')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {t('reminders.actionError')}
        </p>
      )}
    </li>
  );
}

export function ReminderList({
  occurrence,
  standalone = false,
}: {
  occurrence?: ReminderOccurrence;
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const { state, reload } = useDueReminders();
  const headingId = useId();
  if (state.status === 'loading') return standalone ? <Spinner /> : null;
  if (state.status === 'error') {
    return <ErrorState message={t('reminders.loadError')} onRetry={reload} />;
  }
  if (state.status !== 'ready') return null;
  const items = occurrence
    ? state.items.filter(
        (item) => item.id === occurrence.itemId && reminderTime(item) === occurrence.at,
      )
    : state.items;
  if (items.length === 0) {
    return standalone ? (
      <p role="status" className="text-sm text-fg-muted">
        {t(occurrence ? 'reminders.unavailable' : 'reminders.empty')}
      </p>
    ) : null;
  }

  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold">
        {t(occurrence ? 'reminders.title' : 'reminders.due')}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <ReminderRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
