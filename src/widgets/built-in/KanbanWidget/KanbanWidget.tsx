import { Columns3 } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import type { WidgetProps } from '@/core/widget';
import { EmptyState, ErrorState, Skeleton } from '@/ui/feedback';
import { KanbanBoard } from './KanbanBoard';
import { kanbanSelectClass } from './kanbanStyles';
import { useKanbanBoards } from './useKanbanBoards';

export interface KanbanSettings {
  boardId?: string;
}

export function KanbanWidget({ settings, onUpdateSettings }: WidgetProps<KanbanSettings>) {
  const { t } = useTranslation();
  const { boards, error, reload } = useKanbanBoards();
  const board = boards?.find(({ id }) => id === settings.boardId) ?? boards?.[0];

  return (
    <section
      aria-label={t('widgets.kanban')}
      className="@container flex h-full min-h-0 min-w-0 flex-col gap-2 p-2 sm:p-3"
    >
      {error ? (
        <ErrorState
          message={t(
            error instanceof Error && error.name === 'SecurityError'
              ? 'kanban.accessError'
              : 'kanban.loadError',
          )}
          onRetry={reload}
        />
      ) : !boards ? (
        <Skeleton
          role="status"
          aria-label={t('common.loading')}
          className="min-h-24 w-full rounded-xl"
        />
      ) : !board ? (
        <EmptyState
          title={t('kanban.noBoards')}
          icon={<Columns3 aria-hidden="true" className="size-8" />}
        />
      ) : (
        <>
          <label className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            <span>{t('kanban.board')}</span>
            <select
              className={kanbanSelectClass}
              value={board.id}
              onChange={(event) => onUpdateSettings?.({ boardId: event.target.value })}
            >
              {boards.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <KanbanBoard key={board.id} board={board} />
        </>
      )}
    </section>
  );
}
