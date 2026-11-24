import { useMemo, useState } from 'react';
import { Calendar, CalendarCog, RefreshCw } from 'lucide-react';
import { parseIcalendar, type CalendarEvent } from '@/core/calendar/ical';
import { useNow } from '@/core/datetime/useNow';
import { useTranslation } from '@/core/i18n';
import { itemRepository, useItems } from '@/core/items';
import { EmptyState, ErrorState, Spinner } from '@/ui/feedback';
import { Button } from '@/ui/primitives';
import { AgendaConnectionDialog } from './AgendaConnectionDialog';
import { AgendaDayList } from './AgendaDayList';
import { getAgendaDays, listAgendaEntries } from './agendaDays';
import { useCalendarConnection } from './calendarConnection';

const NO_EVENTS: CalendarEvent[] = [];

function AgendaCalendarStatus({
  connection,
}: {
  connection: ReturnType<typeof useCalendarConnection>;
}) {
  const { t } = useTranslation();
  const { state, request, refresh } = connection;
  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'permission') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-fg-muted" role="status">
          {t('agenda.permission')}
        </p>
        <Button size="sm" variant="secondary" onClick={() => void request().catch(refresh)}>
          {t('agenda.allow')}
        </Button>
      </div>
    );
  }
  if (state.status === 'network' || state.status === 'timeout' || state.status === 'tooLarge') {
    return <ErrorState message={t(`agenda.${state.status}`)} onRetry={refresh} />;
  }
  return null;
}

export function AgendaWidget() {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const [week, setWeek] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { items, loading, error, reload } = useItems(itemRepository);
  const connection = useCalendarConnection();
  const text = connection.state.status === 'ready' ? connection.state.text : undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  const days = getAgendaDays(today, week);
  const start = days[0]?.start ?? today;
  const end = days.at(-1)?.end ?? today;

  const calendar = useMemo(() => {
    if (text === undefined) return undefined;
    try {
      return parseIcalendar(text, { start, end, zone });
    } catch {
      return null;
    }
  }, [text, start, end, zone]);
  const entries = useMemo(
    () => listAgendaEntries(items, calendar?.events ?? NO_EVENTS, start, end),
    [items, calendar, start, end],
  );
  const showEmpty =
    !loading &&
    !error &&
    calendar !== null &&
    entries.length === 0 &&
    (connection.state.status === 'empty' || connection.state.status === 'ready');

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col gap-2 p-2 sm:p-3"
      aria-label={t('widgets.agenda')}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label={t('agenda.period')}
        >
          <Button
            size="sm"
            variant={week ? 'ghost' : 'secondary'}
            aria-pressed={!week}
            onClick={() => setWeek(false)}
          >
            {t('agenda.today')}
          </Button>
          <Button
            size="sm"
            variant={week ? 'secondary' : 'ghost'}
            aria-pressed={week}
            onClick={() => setWeek(true)}
          >
            {t('agenda.week')}
          </Button>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          {connection.connected && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('agenda.refresh')}
              onClick={connection.refresh}
              disabled={connection.state.status === 'loading'}
              icon={<RefreshCw aria-hidden="true" size={18} />}
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('agenda.calendar')}
            onClick={() => setShowCalendar(true)}
            aria-haspopup="dialog"
            icon={<CalendarCog aria-hidden="true" size={18} />}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pe-1">
        <AgendaCalendarStatus connection={connection} />
        {loading && <Spinner />}
        {error && <ErrorState message={t('agenda.tasksError')} onRetry={reload} />}
        {calendar === null && (
          <ErrorState message={t('agenda.invalidCalendar')} onRetry={connection.refresh} />
        )}
        {(calendar?.unsupported ?? 0) > 0 && (
          <p className="text-xs text-fg-muted" role="status">
            {t('agenda.unsupported')}
          </p>
        )}
        {calendar?.truncated && (
          <p className="text-xs text-fg-muted" role="status">
            {t('agenda.truncated')}
          </p>
        )}
        {showEmpty && (
          <EmptyState
            title={t('agenda.empty')}
            description={t('agenda.emptyHint')}
            icon={<Calendar aria-hidden="true" size={24} />}
          />
        )}
        {days.map((day) => (
          <AgendaDayList key={day.start} day={day} entries={entries} />
        ))}
      </div>
      {showCalendar && (
        <AgendaConnectionDialog
          connected={connection.connected}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </section>
  );
}
