import type { Board, BoardColumn, Item, ItemMoveTarget } from '@/core/items';

export interface Lane {
  column: BoardColumn;
  items: Item[];
  configured: boolean;
}

export interface Placement {
  laneId: string;
  index: number;
}

export function collectLanes(board: Board, items: readonly Item[]): Lane[] {
  const lanes = new Map(
    board.columns.map((column): [string, Lane] => [
      column.id,
      { column, items: [], configured: true },
    ]),
  );
  for (const item of items) {
    if (item.boardId !== board.id) continue;
    let lane = lanes.get(item.status);
    if (!lane) {
      lane = {
        column: { id: item.status, title: item.status },
        items: [],
        configured: false,
      };
      lanes.set(item.status, lane);
    }
    lane.items.push(item);
  }
  return [...lanes.values()];
}

export const neighbors = (lane: Lane, item: Item): Item[] =>
  lane.items.filter((candidate) => candidate.id !== item.id);

export function moveTarget(lane: Lane, item: Item, index: number): ItemMoveTarget | null {
  const currentIndex = lane.items.findIndex((candidate) => candidate.id === item.id);
  if (currentIndex === index || (!lane.configured && currentIndex < 0)) return null;
  const remaining = neighbors(lane, item);
  return {
    status: lane.column.id,
    boardId: item.boardId,
    expectedVersion: item.version,
    afterId: remaining[index - 1]?.id,
    beforeId: remaining[index]?.id,
  };
}

export function stepPlacement(
  lanes: readonly Lane[],
  item: Item,
  placement: Placement,
  key: string,
  collapsed: ReadonlySet<string>,
): Placement {
  const laneIndex = lanes.findIndex((lane) => lane.column.id === placement.laneId);
  const lane = lanes[laneIndex];
  if (!lane) return placement;
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    if (collapsed.has(lane.column.id)) return placement;
    const index = placement.index + (key === 'ArrowUp' ? -1 : 1);
    return { ...placement, index: Math.max(0, Math.min(index, neighbors(lane, item).length)) };
  }
  const direction = key === 'ArrowLeft' ? -1 : 1;
  for (
    let position = laneIndex + direction;
    position >= 0 && position < lanes.length;
    position += direction
  ) {
    const target = lanes[position];
    if (!target || (!target.configured && target.column.id !== item.status)) continue;
    const end = neighbors(target, item).length;
    return {
      laneId: target.column.id,
      index: collapsed.has(target.column.id) ? end : Math.min(placement.index, end),
    };
  }
  return placement;
}
