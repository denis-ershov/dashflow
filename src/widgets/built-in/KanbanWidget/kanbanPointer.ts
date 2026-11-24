import { pointerWithin, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core';
import type { Item } from '@/core/items';
import { cardDropId } from './KanbanCard';
import { laneDropId } from './KanbanLane';
import { neighbors, type Lane, type Placement } from './kanbanOrder';

export const kanbanCollision: CollisionDetection = (input) => {
  const targets = pointerWithin(input);
  const card = targets.find(({ id }) => String(id).startsWith('item:'));
  return card ? [card] : targets;
};

export function pointerPlacement(
  lanes: readonly Lane[],
  item: Item,
  { active, over }: DragEndEvent,
): Placement | undefined {
  if (!over || over.id === active.id) return;
  for (const lane of lanes) {
    const laneId = lane.column.id;
    const items = neighbors(lane, item);
    if (over.id === laneDropId(laneId)) return { laneId, index: items.length };
    const target = items.findIndex((candidate) => cardDropId(candidate.id) === over.id);
    if (target < 0) continue;
    const translated = active.rect.current.translated;
    const after = translated
      ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
      : false;
    return { laneId, index: target + Number(after) };
  }
}
