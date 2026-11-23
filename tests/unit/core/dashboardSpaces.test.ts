import { describe, expect, it } from 'vitest';
import {
  activeSpaceOf,
  createDefaultDashboardSnapshot,
  deriveResponsiveLayouts,
  exportDashboardSnapshot,
  migrateDashboardSnapshot,
} from '@/core/storage';

describe('Формат пространств и экспорт 3.0', () => {
  it('возвращает все пространства и активную сетку, которую может прочитать 3.8', () => {
    const home = createDefaultDashboardSnapshot();
    const work = {
      id: 'work',
      title: 'Работа',
      instances: [],
      layouts: deriveResponsiveLayouts([]),
      baseColumns: 16 as const,
      gap: 24,
    };
    const snapshot = { ...home, activeSpaceId: work.id, spaces: [...home.spaces, work] };
    const exported = exportDashboardSnapshot(snapshot);
    expect(exported).toMatchObject({ version: 2, instances: [], baseColumns: 16 });
    expect(migrateDashboardSnapshot(JSON.parse(JSON.stringify(exported)))).toEqual(snapshot);
  });

  it('выбирает первое валидное пространство и устраняет повторные привязки экземпляров', () => {
    const snapshot = createDefaultDashboardSnapshot();
    const home = activeSpaceOf(snapshot);
    const restored = migrateDashboardSnapshot({
      ...snapshot,
      activeSpaceId: 'missing',
      spaces: [null, home, { ...home, id: 'duplicate-widgets' }],
    });
    expect(activeSpaceOf(restored).id).toBe(home.id);
    expect(restored.spaces[1]?.instances).toEqual([]);
    expect(restored.spaces[1]?.layouts.xl).toEqual([]);
  });
});
