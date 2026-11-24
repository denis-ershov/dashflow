import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { commandBus } from '@/core/commands';
import { useTranslation, type TranslationKey } from '@/core/i18n';
import { itemRepository, ItemConflictError, useItems, type Board, type Item } from '@/core/items';
import { ErrorState, Skeleton } from '@/ui/feedback';
import { KanbanCard, cardDropId } from './KanbanCard';
import { KanbanLane, type KanbanLaneApi } from './KanbanLane';
import { KanbanDetails } from './KanbanDetails';
import {
  collectLanes,
  moveTarget,
  neighbors,
  stepPlacement,
  type Lane,
  type Placement,
} from './kanbanOrder';
import { kanbanCollision, pointerPlacement } from './kanbanPointer';
import { kanbanSelectClass } from './kanbanStyles';

interface KeyboardDrag {
  item: Item;
  target: Placement;
}

interface FocusTarget {
  itemId: string;
  action: 'open' | 'drag';
  version?: number;
}

const arrowKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const noAnnouncement = () => undefined;
const silentAnnouncements = {
  onDragStart: noAnnouncement,
  onDragOver: noAnnouncement,
  onDragEnd: noAnnouncement,
  onDragCancel: noAnnouncement,
};

export function KanbanBoard({ board }: { board: Board }) {
  const { t, formatNumber } = useTranslation();
  const { items, loading, error, reload } = useItems(itemRepository, { boardId: board.id });
  const lanes = useMemo(() => collectLanes(board, items), [board, items]);
  const prefix = useId();
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const laneApis = useRef(new Map<string, KanbanLaneApi>());
  const pointerItem = useRef<Item>(null);
  const moving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [keyboard, setKeyboard] = useState<KeyboardDrag>();
  const [pointer, setPointer] = useState<Item>();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [jumpedTo, setJumpedTo] = useState('');
  const [openId, setOpenId] = useState<string>();
  const [focus, setFocus] = useState<FocusTarget>();
  const [notice, setNotice] = useState('');
  const [moveError, setMoveError] = useState<TranslationKey>();

  const current = items.find((item) => item.id === openId);
  const headingId = (columnId: string) => `${prefix}-column-${columnId}`;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columnName = (lane: Lane) =>
    lane.configured ? lane.column.title : t('kanban.unknownColumn', { status: lane.column.id });

  const describePlacement = (
    key: 'kanban.position' | 'kanban.moved',
    item: Item,
    lane: Lane,
    index: number,
  ) => t(key, { title: item.title, column: columnName(lane), position: formatNumber(index + 1) });

  const registerLaneApi = useCallback((id: string, api?: KanbanLaneApi) => {
    if (api) laneApis.current.set(id, api);
    else laneApis.current.delete(id);
  }, []);

  useEffect(() => {
    if (!focus) return;
    const item = items.find(({ id }) => id === focus.itemId);
    if (item && focus.version !== undefined && item.version < focus.version) return;
    const lane = item && lanes.find(({ items: laneItems }) => laneItems.some(({ id }) => id === item.id));
    const focused = lane ? laneApis.current.get(lane.column.id)?.focusItem(focus.itemId, focus.action) : false;
    if (!focused) {
      sectionRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-kanban-item="${CSS.escape(focus.itemId)}"][data-kanban-action="${focus.action}"]`,
        )
        ?.focus();
    }
    setFocus(undefined);
  }, [focus, items, lanes]);

  const move = async (
    item: Item,
    placement: Placement,
    mode: 'pointer' | 'keyboard' | 'details',
  ) => {
    if (moving.current) return;
    const lane = lanes.find(({ column }) => column.id === placement.laneId);
    const target = lane && moveTarget(lane, item, placement.index);
    if (!lane || !target) {
      setNotice(t('kanban.unchanged'));
      return;
    }

    moving.current = true;
    setBusy(true);
    setMoveError(undefined);
    setNotice('');
    try {
      const { result: updated } = await commandBus.dispatch<Item>('item.move', {
        id: item.id,
        ...target,
      });
      const overLimit =
        lane.column.wipLimit !== undefined &&
        neighbors(lane, item).length + 1 > lane.column.wipLimit;
      setNotice(
        [
          describePlacement('kanban.moved', item, lane, placement.index),
          overLimit ? t('kanban.limitExceeded') : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      if (mode !== 'pointer') {
        setCollapsed((previous) => {
          const next = new Set(previous);
          next.delete(lane.column.id);
          return next;
        });
        if (mode === 'keyboard')
          setFocus({ itemId: item.id, action: 'drag', version: updated.version });
      }
    } catch (reason) {
      setMoveError(reason instanceof ItemConflictError ? 'kanban.conflict' : 'kanban.moveError');
      reload();
    } finally {
      moving.current = false;
      setBusy(false);
    }
  };

  const cancelKeyboard = () => {
    setKeyboard(undefined);
    setNotice(t('kanban.cancelled'));
  };

  const closeDetails = useCallback(() => {
    if (moving.current) return;
    setOpenId(undefined);
    setMoveError(undefined);
    if (openId) setFocus({ itemId: openId, action: 'open' });
  }, [openId]);

  const handleDragKey = (event: KeyboardEvent<HTMLButtonElement>, item: Item, lane: Lane) => {
    if (moving.current || pointerItem.current) return;
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (keyboard?.item.id === item.id) {
        setKeyboard(undefined);
        void move(keyboard.item, keyboard.target, 'keyboard');
      } else {
        setMoveError(undefined);
        const index = lane.items.findIndex(({ id }) => id === item.id);
        setKeyboard({ item, target: { laneId: lane.column.id, index } });
        setNotice(t('kanban.pickedUp', { title: item.title }));
      }
      return;
    }
    if (!keyboard || keyboard.item.id !== item.id) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelKeyboard();
    } else if (arrowKeys.has(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const key =
        rtl && event.key === 'ArrowLeft'
          ? 'ArrowRight'
          : rtl && event.key === 'ArrowRight'
            ? 'ArrowLeft'
            : event.key;
      const target = stepPlacement(lanes, item, keyboard.target, key, collapsed);
      const destination = lanes.find(({ column }) => column.id === target.laneId);
      setKeyboard({ ...keyboard, target });
      if (destination)
        setNotice(describePlacement('kanban.position', item, destination, target.index));
    }
  };

  if (error)
    return (
      <ErrorState
        message={t(error.name === 'SecurityError' ? 'kanban.accessError' : 'kanban.loadError')}
        onRetry={reload}
      />
    );
  if (loading)
    return (
      <Skeleton
        role="status"
        aria-label={t('common.loading')}
        className="min-h-24 w-full rounded-xl"
      />
    );

  return (
    <div ref={sectionRef} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <p className="sr-only" id={`${prefix}-instructions`}>
        {t('kanban.instructions')}
      </p>
      <p className="sr-only" role="status" aria-atomic="true">
        {current ? '' : notice}
      </p>
      {moveError && !current && (
        <p className="text-xs text-danger" role="alert">
          {t(moveError)}
        </p>
      )}
      <label className="flex shrink-0 flex-wrap items-center gap-x-2 text-xs text-fg-muted @sm:hidden">
        <span>{t('kanban.jumpTo')}</span>
        <select
          className={kanbanSelectClass}
          value={jumpedTo}
          onChange={(event) => {
            const id = event.target.value;
            setJumpedTo(id);
            const heading = document.getElementById(headingId(id));
            heading?.scrollIntoView({ block: 'nearest' });
            setJumpedTo('');
          }}
        >
          <option value="" disabled>
            {t('kanban.chooseColumn')}
          </option>
          {lanes.map((lane) => (
            <option key={lane.column.id} value={lane.column.id}>
              {columnName(lane)}
            </option>
          ))}
        </select>
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        accessibility={{ announcements: silentAnnouncements, restoreFocus: false }}
        onDragStart={({ active }) => {
          if (moving.current) return;
          const item = items.find(({ id }) => cardDropId(id) === active.id);
          if (!item) return;
          setKeyboard(undefined);
          setMoveError(undefined);
          pointerItem.current = item;
          setPointer(item);
          setNotice(t('kanban.pickedUp', { title: item.title }));
        }}
        onDragCancel={() => {
          pointerItem.current = null;
          setPointer(undefined);
          setNotice(t('kanban.cancelled'));
        }}
        onDragEnd={(event) => {
          const item = pointerItem.current;
          pointerItem.current = null;
          setPointer(undefined);
          if (!item) return;
          const target = pointerPlacement(lanes, item, event);
          if (target) void move(item, target, 'pointer');
          else setNotice(t(event.over ? 'kanban.unchanged' : 'kanban.cancelled'));
        }}
      >
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1">
          <div className="grid items-start gap-2 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] @max-sm:grid-cols-1">
            {lanes.map((lane) => (
              <KanbanLane
                key={lane.column.id}
                lane={lane}
                headingId={headingId(lane.column.id)}
                collapsed={collapsed.has(lane.column.id)}
                highlighted={keyboard?.target.laneId === lane.column.id}
                scrollRef={scrollRef}
                pinnedItem={keyboard?.item.id ?? pointer?.id}
                onApi={registerLaneApi}
                onToggle={() => {
                  setCollapsed((previous) => {
                    const next = new Set(previous);
                    if (!next.delete(lane.column.id)) next.add(lane.column.id);
                    return next;
                  });
                }}
                renderCard={(item, position, style) => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    disabled={busy || Boolean(keyboard && keyboard.item.id !== item.id)}
                    dragging={keyboard?.item.id === item.id}
                    instructionsId={`${prefix}-instructions`}
                    position={position}
                    count={position === undefined ? undefined : lane.items.length}
                    style={style}
                    onDragKey={(event) => handleDragKey(event, item, lane)}
                    onBlur={() => {
                      if (keyboard?.item.id === item.id) cancelKeyboard();
                    }}
                    onOpen={() => {
                      setMoveError(undefined);
                      setNotice('');
                      setOpenId(item.id);
                    }}
                  />
                )}
              />
            ))}
          </div>
        </div>
        {createPortal(
          <DragOverlay dropAnimation={null} className="pointer-events-none">
            {pointer && (
              <div
                aria-hidden="true"
                className="rounded-xl border border-primary bg-canvas p-3 text-sm font-semibold text-fg shadow-2 wrap-anywhere"
              >
                {pointer.title}
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      {current && (
        <KanbanDetails
          item={current}
          lanes={lanes}
          busy={busy}
          error={moveError && t(moveError)}
          notice={notice}
          onMove={(target) => void move(current, target, 'details')}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}
