import { Calendar, CheckSquare } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { onAgendaDay, type AgendaDay, type AgendaEntry } from './agendaDays';

const MAX_VISIBLE_PER_DAY = 100;

export function AgendaDayList({ day, entries }: { day: AgendaDay; entries: AgendaEntry[] }) {
  const { t, formatDate } = useTranslation();
  const dayEntries = entries.filter((entry) => onAgendaDay(entry, day));
  if (dayEntries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-fg-muted">
        {formatDate(day.start, { weekday: 'long', month: 'short', day: 'numeric' })}
      </h3>
      <ul className="space-y-1.5">
        {dayEntries.slice(0, MAX_VISIBLE_PER_DAY).map((entry) => {
          const Icon = entry.task ? CheckSquare : Calendar;
          return (
            <li
              key={entry.id}
              className="flex min-w-0 items-start gap-2 rounded-xl border border-line p-2.5"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="wrap-anywhere text-sm font-medium" dir="auto">
                  {entry.title || t('agenda.untitled')}
                </p>
                <p className="text-xs text-fg-muted">
                  {entry.task && <span>{t('agenda.deadline')} </span>}
                  {entry.allDay ? (
                    t('agenda.allDay')
                  ) : entry.start < day.start ? (
                    t('agenda.continues')
                  ) : (
                    <time dateTime={new Date(entry.start).toISOString()}>
                      {formatDate(entry.start, { timeStyle: 'short' })}
                    </time>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {dayEntries.length > MAX_VISIBLE_PER_DAY && (
        <p className="text-xs text-fg-muted" role="status">
          {t('agenda.truncated')}
        </p>
      )}
    </div>
  );
}
