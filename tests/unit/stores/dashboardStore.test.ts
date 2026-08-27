import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '@/stores/useDashboardStore';

describe('useDashboardStore (v2)', () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().resetDashboard();
  });

  it('должен инициализироваться с дефолтными 5 виджетами и раскладками v2', () => {
    const state = useDashboardStore.getState();
    expect(state.version).toBe(2);
    expect(state.baseColumns).toBe(12);
    expect(state.instances).toHaveLength(5);
    expect(state.layouts.xl).toHaveLength(5);
    expect(state.layouts.sm).toHaveLength(5);
  });

  it('должен добавлять новый виджет и рассчитывать позицию в раскладках без наложений', () => {
    const store = useDashboardStore.getState();
    store.addWidget('pomodoro', 4, 3);

    const updated = useDashboardStore.getState();
    expect(updated.instances).toHaveLength(6);
    const added = updated.instances.find((w) => w.widgetId === 'pomodoro');
    expect(added).toBeDefined();

    expect(updated.layouts.xl).toHaveLength(6);
    expect(updated.layouts.xl.some((l) => l.i === added?.instanceId)).toBe(true);

    // Добавляем еще 2 виджета и проверяем отсутствие коллизий на всех раскладках
    store.addWidget('quotes', 4, 3);
    store.addWidget('notes', 6, 4);

    const xlLayout = useDashboardStore.getState().layouts.xl;
    expect(xlLayout).toHaveLength(8);

    for (let i = 0; i < xlLayout.length; i++) {
      for (let j = i + 1; j < xlLayout.length; j++) {
        const itemA = xlLayout[i];
        const itemB = xlLayout[j];
        const collides = !(
          itemA.x + itemA.w <= itemB.x ||
          itemA.x >= itemB.x + itemB.w ||
          itemA.y + itemA.h <= itemB.y ||
          itemA.y >= itemB.y + itemB.h
        );
        expect(collides).toBe(false);
      }
    }
  });

  it('должен удалять виджет из instances и всех раскладок layouts', () => {
    const store = useDashboardStore.getState();
    const firstInstanceId = store.instances[0].instanceId;

    store.removeWidget(firstInstanceId);

    const updated = useDashboardStore.getState();
    expect(updated.instances).toHaveLength(4);
    expect(updated.instances.some((w) => w.instanceId === firstInstanceId)).toBe(false);
    expect(updated.layouts.xl.some((l) => l.i === firstInstanceId)).toBe(false);
  });

  it('должен обновлять настройки конкретного экземпляра виджета', () => {
    const store = useDashboardStore.getState();
    const firstInstanceId = store.instances[0].instanceId;

    store.updateWidgetSettings(firstInstanceId, { customOption: 42 });

    const updated = useDashboardStore.getState();
    const updatedInstance = updated.instances.find((w) => w.instanceId === firstInstanceId);
    expect(updatedInstance?.settings).toEqual({ customOption: 42 });
  });

  it('должен обновлять раскладку для конкретного брейкпоинта', () => {
    const store = useDashboardStore.getState();
    const newXlLayout = store.layouts.xl.map((item, idx) => ({
      ...item,
      x: idx * 2,
    }));

    store.updateLayout('xl', newXlLayout);

    const updated = useDashboardStore.getState();
    expect(updated.layouts.xl[0].x).toBe(0);
    expect(updated.layouts.xl[1].x).toBe(2);
  });

  it('должен переключать режимы редактирования и блокировки', () => {
    const store = useDashboardStore.getState();
    expect(store.isEditMode).toBe(false);

    store.toggleEditMode();
    expect(useDashboardStore.getState().isEditMode).toBe(true);

    store.setLocked(true);
    expect(useDashboardStore.getState().isLocked).toBe(true);
  });
});
