import {
  activeLayoutModeOf,
  activeSpaceOf,
  createDefaultDashboardState,
  StorageAdapter,
  STORAGE_KEYS,
} from '@/core/storage';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore, pickPersistedDashboard } from '@/stores/useDashboardStore';
import { at } from '../../helpers/at';

describe('useDashboardStore (v3)', () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().resetDashboard();
  });

  it('должен инициализироваться с дефолтными 5 виджетами и раскладками v3', () => {
    const state = useDashboardStore.getState();
    expect(state.version).toBe(3);
    expect(activeSpaceOf(state).baseColumns).toBe(12);
    expect(activeSpaceOf(state).instances).toHaveLength(5);
    expect(activeSpaceOf(state).layouts.xl).toHaveLength(5);
    expect(activeSpaceOf(state).layouts.sm).toHaveLength(5);
  });

  it('должен добавлять новый виджет и рассчитывать позицию в раскладках без наложений', () => {
    const store = useDashboardStore.getState();
    store.addWidget('pomodoro', 4, 3);

    const updated = useDashboardStore.getState();
    expect(activeSpaceOf(updated).instances).toHaveLength(6);
    const added = activeSpaceOf(updated).instances.find((w) => w.widgetId === 'pomodoro');
    expect(added).toBeDefined();

    expect(activeSpaceOf(updated).layouts.xl).toHaveLength(6);
    expect(activeSpaceOf(updated).layouts.xl.some((l) => l.i === added?.instanceId)).toBe(true);

    // Добавляем еще 2 виджета и проверяем отсутствие коллизий на всех раскладках
    store.addWidget('quotes', 4, 3);
    store.addWidget('notes', 6, 4);

    const xlLayout = activeSpaceOf(useDashboardStore.getState()).layouts.xl;
    expect(xlLayout).toHaveLength(8);

    for (let i = 0; i < xlLayout.length; i++) {
      for (let j = i + 1; j < xlLayout.length; j++) {
        const itemA = at(xlLayout, i);
        const itemB = at(xlLayout, j);
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
    const firstInstanceId = at(activeSpaceOf(store).instances, 0).instanceId;

    store.removeWidget(firstInstanceId);

    const updated = useDashboardStore.getState();
    expect(activeSpaceOf(updated).instances).toHaveLength(4);
    expect(activeSpaceOf(updated).instances.some((w) => w.instanceId === firstInstanceId)).toBe(
      false,
    );
    expect(activeSpaceOf(updated).layouts.xl.some((l) => l.i === firstInstanceId)).toBe(false);
  });

  it('должен обновлять настройки конкретного экземпляра виджета', () => {
    const store = useDashboardStore.getState();
    const firstInstanceId = at(activeSpaceOf(store).instances, 0).instanceId;

    store.updateWidgetSettings(firstInstanceId, { customOption: 42 });

    const updated = useDashboardStore.getState();
    const updatedInstance = activeSpaceOf(updated).instances.find(
      (w) => w.instanceId === firstInstanceId,
    );
    expect(updatedInstance?.settings).toEqual({ customOption: 42 });
  });

  it('должен обновлять раскладку для конкретного брейкпоинта', () => {
    const store = useDashboardStore.getState();
    const newXlLayout = activeSpaceOf(store).layouts.xl.map((item, idx) => ({
      ...item,
      x: idx * 2,
    }));

    store.updateLayout('xl', newXlLayout);

    const updated = useDashboardStore.getState();
    expect(activeSpaceOf(updated).layouts.xl[0]?.x).toBe(0);
    expect(activeSpaceOf(updated).layouts.xl[1]?.x).toBe(2);
  });

  it('должен переключать режим редактирования', () => {
    const store = useDashboardStore.getState();
    expect(store.isEditMode).toBe(false);

    store.toggleEditMode();
    expect(useDashboardStore.getState().isEditMode).toBe(true);
  });

  it('переключает независимые сетки и сохраняет настройки уже скрытого виджета', () => {
    const store = useDashboardStore.getState();
    const homeId = store.activeSpaceId;
    const instance = at(activeSpaceOf(store).instances, 0);
    expect(store.createSpace('   ')).toBe(false);
    expect(store.createSpace(' Работа ')).toBe(true);
    const work = activeSpaceOf(useDashboardStore.getState());
    expect(work.title).toBe('Работа');
    expect(work.instances).toHaveLength(0);
    store.setBaseColumns(16);
    store.addWidget('notes');
    store.updateWidgetSettings(instance.instanceId, { fromPendingBinding: true });
    store.switchSpace(homeId);
    const home = activeSpaceOf(useDashboardStore.getState());
    expect(home.baseColumns).toBe(12);
    expect(at(home.instances, 0).settings).toEqual({ fromPendingBinding: true });
    store.switchSpace(work.id);
    expect(activeSpaceOf(useDashboardStore.getState()).baseColumns).toBe(16);
    expect(activeSpaceOf(useDashboardStore.getState()).instances).toHaveLength(1);
  });

  it('создаёт независимые режимы шаблонов и сохраняет общий режим для пустых пространств', () => {
    const {
      activeSpaceId: homeId,
      createSpace,
      setLayoutMode,
      switchSpace,
    } = useDashboardStore.getState();
    const snapshot = useDashboardStore.getState;
    setLayoutMode('zen');
    expect(createSpace('Утро', 'morning')).toBe(true);
    const morning = activeSpaceOf(snapshot());
    expect(activeLayoutModeOf(snapshot())).toBe('modular');
    expect(morning.instances.map(({ widgetId }) => widgetId)).toEqual(['digest', 'agenda']);
    expect(createSpace('Фокус', 'focus')).toBe(true);
    const focus = activeSpaceOf(snapshot());
    expect(activeLayoutModeOf(snapshot())).toBe('canvas');
    expect(focus.instances.map(({ widgetId }) => widgetId)).toEqual(['todo', 'pomodoro']);
    expect(focus.layouts.xs.map(({ i, x }) => [i, x])).toEqual(
      focus.instances.map(({ instanceId }) => [instanceId, 0]),
    );

    setLayoutMode('modular');
    switchSpace(homeId);
    expect(activeLayoutModeOf(snapshot())).toBe('zen');
    expect(createSpace('Пустое')).toBe(true);
    expect(activeLayoutModeOf(snapshot())).toBe('zen');
    switchSpace(focus.id);
    expect(activeLayoutModeOf(snapshot())).toBe('modular');
    expect(createSpace('Другой фокус', 'focus')).toBe(true);
    expect(activeSpaceOf(snapshot()).instances.map(({ instanceId }) => instanceId)).not.toEqual(
      focus.instances.map(({ instanceId }) => instanceId),
    );
  });

  it('при удалении активного пространства выбирает оставшееся и сохраняет последнее', () => {
    const store = useDashboardStore.getState();
    store.createSpace('Работа');
    const workId = useDashboardStore.getState().activeSpaceId;
    store.removeSpace(workId);
    store.removeSpace(store.activeSpaceId);
    const state = useDashboardStore.getState();
    expect(state.spaces.map((space) => space.id)).toEqual([store.activeSpaceId]);
    expect(state.activeSpaceId).toBe(store.activeSpaceId);
  });

  it('сначала сохраняет резервную копию v2, затем переносит пользовательскую раскладку', async () => {
    const state = createDefaultDashboardState();
    const mobile = at(state.layouts.sm, 0);
    state.layouts.sm = [{ ...mobile, y: 7 }, ...state.layouts.sm.slice(1)];
    const previous = { state, version: 2 };
    await StorageAdapter.set(STORAGE_KEYS.DASHBOARD, previous);
    await useDashboardStore.persist.rehydrate();
    expect(await StorageAdapter.get(STORAGE_KEYS.DASHBOARD_BACKUP_V2, null)).toEqual(
      JSON.parse(JSON.stringify(previous)),
    );
    const migrated = useDashboardStore.getState();
    expect(migrated.version).toBe(3);
    expect(activeSpaceOf(migrated).layouts.sm[0]?.y).toBe(7);
    expect(await StorageAdapter.get(STORAGE_KEYS.DASHBOARD, null)).toMatchObject({ version: 3 });
  });
});

describe('useDashboardStore: что переживает перезагрузку', () => {
  const options = () => useDashboardStore.persist.getOptions();

  beforeEach(() => {
    useDashboardStore.getState().resetDashboard();
  });

  it('сохраняет только данные дашборда, без состояния UI', () => {
    const store = useDashboardStore.getState();
    store.setActiveModal('settings');
    store.setEditMode(true);
    store.setCommandPaletteOpen(true);

    const persisted = options().partialize!(useDashboardStore.getState()) as Record<
      string,
      unknown
    >;

    expect(Object.keys(persisted).sort()).toEqual(
      ['activeSpaceId', 'heroSettings', 'layoutMode', 'spaces', 'speedDialLinks', 'version'].sort(),
    );
  });

  it('при чтении старого сохранения игнорирует activeModal, isEditMode и legacy widgets', () => {
    const current = useDashboardStore.getState();
    const legacyPersisted = {
      ...pickPersistedDashboard(current),
      spaces: current.spaces.map((space) => ({ ...space, gap: 24 })),
      activeModal: 'settings',
      isEditMode: true,
      widgets: [{ instanceId: 'x', widgetId: 'clock', x: 0, y: 0, w: 1, h: 1 }],
    };

    const merged = options().merge!(legacyPersisted, current);

    expect(activeSpaceOf(merged).gap).toBe(24);
    expect(merged.activeModal).toBeNull();
    expect(merged.isEditMode).toBe(false);
    expect(merged).not.toHaveProperty('widgets');
  });
});
