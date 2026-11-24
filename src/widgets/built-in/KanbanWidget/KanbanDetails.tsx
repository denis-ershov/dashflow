import { useState } from 'react';
import { useTranslation } from '@/core/i18n';
import type { Item } from '@/core/items';
import { MarkdownPreview } from '@/ui/feedback/MarkdownPreview';
import { Drawer } from '@/ui/overlays';
import { Button } from '@/ui/primitives';
import { CardMetadata } from './KanbanCard';
import { KanbanEarlierVersion } from './KanbanEarlierVersion';
import type { Lane, Placement } from './kanbanOrder';
import { kanbanSelectClass } from './kanbanStyles';

interface KanbanDetailsProps {
  item: Item;
  lanes: readonly Lane[];
  busy: boolean;
  error?: string;
  notice: string;
  onMove: (target: Placement) => void;
  onClose: () => void;
}

export function KanbanDetails({
  item,
  lanes,
  busy,
  error,
  notice,
  onMove,
  onClose,
}: KanbanDetailsProps) {
  const { t } = useTranslation();
  const [chosenColumn, setChosenColumn] = useState('');
  const lane = lanes.find(({ column }) => column.id === item.status);
  const index = lane?.items.findIndex(({ id }) => id === item.id) ?? -1;
  const destinations = lanes.filter(
    ({ column, configured }) => configured && column.id !== item.status,
  );
  const destination = destinations.find(({ column }) => column.id === chosenColumn);

  return (
    <Drawer isOpen onClose={onClose} title={t('kanban.details')} className="min-w-0">
      <div className="min-w-0 space-y-3 wrap-anywhere">
        <h4 className="text-xl font-semibold text-fg">{item.title}</h4>
        <CardMetadata item={item} />
        {item.body ? (
          <MarkdownPreview text={item.body} />
        ) : (
          <p className="text-sm text-fg-muted">{t('kanban.noDescription')}</p>
        )}
      </div>
      <KanbanEarlierVersion itemId={item.id} version={item.version} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || index <= 0}
            onClick={() => onMove({ laneId: item.status, index: index - 1 })}
          >
            {t('kanban.moveUp')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || !lane || index >= lane.items.length - 1}
            onClick={() => onMove({ laneId: item.status, index: index + 1 })}
          >
            {t('kanban.moveDown')}
          </Button>
        </div>
        {destinations.length > 0 && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (destination)
                onMove({ laneId: destination.column.id, index: destination.items.length });
            }}
          >
            <label className="flex min-w-0 flex-col gap-1 text-xs text-fg-muted">
              <span>{t('kanban.destination')}</span>
              <select
                className={kanbanSelectClass}
                disabled={busy}
                value={destination?.column.id ?? ''}
                onChange={(event) => setChosenColumn(event.target.value)}
              >
                <option value="" disabled>
                  {t('kanban.chooseColumn')}
                </option>
                {destinations.map(({ column }) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" loading={busy} disabled={!destination}>
              {t('kanban.move')}
            </Button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <p role="status" aria-atomic="true" className="text-xs text-fg-muted empty:hidden">
          {notice}
        </p>
      </div>
    </Drawer>
  );
}
