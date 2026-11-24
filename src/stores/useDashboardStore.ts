import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';
import { t } from '@/core/i18n';
import { toast } from '@/ui/primitives/Toast';
import {
  StorageAdapter,
  STORAGE_KEYS,
  BREAKPOINTS,
  BREAKPOINT_COLUMNS,
  migrateDashboardSnapshot,
  SPACE_TITLE_LIMIT,
  activeHeroSettingsOf,
  activeSpaceOf,
  normalizeSpaceWallpaper,
  deriveResponsiveLayouts,
  createDashboardSpace,
  createDefaultDashboardSnapshot,
  findFirstAvailablePosition,
  isRectangleColliding,
  resolveLayoutCollisions,
  type Breakpoint,
  type BaseColumns,
  type LayoutItem,
  type DashboardSnapshot,
  type DashboardSpace,
  type ActiveModal,
  type HeroSettings,
  type SpeedDialLink,
  type SpacePreset,
  type SpaceWallpaper,
} from '@/core/storage';

export type { ActiveModal };

export type LayoutMode = DashboardSnapshot['layoutMode'];

interface DashboardRemoval {
  title: string;
  restore: () => boolean;
}

export interface DashboardState extends DashboardSnapshot {
  isEditMode: boolean;
  isCommandPaletteOpen: boolean;
  activeModal: ActiveModal;

  createSpace: (title: string, preset?: SpacePreset) => boolean;
  applyOnboardingPreset: (preset: SpacePreset) => boolean;
  switchSpace: (id: string) => void;
  removeSpace: (id: string) => DashboardRemoval | undefined;

  // Actions
  toggleEditMode: () => void;
  setEditMode: (val: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  updateHeroSettings: (settings: Partial<HeroSettings>) => void;
  setSpaceWallpaper: (value: SpaceWallpaper | undefined) => boolean;
  addSpeedDialLink: (link: Omit<SpeedDialLink, 'id'>) => void;
  removeSpeedDialLink: (id: string) => DashboardRemoval | undefined;
  updateSpeedDialLink: (id: string, link: Partial<SpeedDialLink>) => void;
  setCommandPaletteOpen: (val: boolean) => void;
  setBaseColumns: (cols: BaseColumns) => void;
  setGap: (gap: number) => void;
  setActiveModal: (modal: ActiveModal) => void;

  addWidget: (
    widgetId: string,
    defaultW?: number,
    defaultH?: number,
    initialSettings?: Record<string, unknown>,
  ) => void;
  removeWidget: (instanceId: string, spaceId?: string) => DashboardRemoval | undefined;
  updateWidgetSettings: (instanceId: string, settings: Record<string, unknown>) => void;
  updateLayout: (breakpoint: Breakpoint, items: LayoutItem[]) => void;
  resetDashboard: () => void;
}

export function pickPersistedDashboard({
  version,
  activeSpaceId,
  spaces,
  layoutMode,
  heroSettings,
  speedDialLinks,
}: DashboardState): DashboardSnapshot {
  return { version, activeSpaceId, spaces, layoutMode, heroSettings, speedDialLinks };
}

function updateSpace(
  state: DashboardState,
  id: string,
  update: (space: DashboardSpace) => Partial<DashboardSpace>,
) {
  return {
    spaces: state.spaces.map((space) => (space.id === id ? { ...space, ...update(space) } : space)),
  };
}

function stableSnapshot(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSnapshot).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSnapshot(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function updateActiveSpace(
  state: DashboardState,
  update: (space: DashboardSpace) => Partial<DashboardSpace>,
) {
  return updateSpace(state, state.activeSpaceId, update);
}

function detachEntry<T extends object>(items: T[], id: string, identify: (item: T) => string) {
  const index = items.findIndex((item) => identify(item) === id);
  const entry = items[index];
  if (!entry) return;
  const next = items[index + 1];
  const previous = items[index - 1];
  const nextId = next && identify(next);
  const previousId = previous && identify(previous);
  return {
    entry,
    remaining: items.filter((item) => identify(item) !== id),
    insert: (current: T[], restored = entry) => {
      const nextIndex = current.findIndex((item) => identify(item) === nextId);
      const previousIndex = current.findIndex((item) => identify(item) === previousId);
      const at = nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : index;
      return [...current.slice(0, at), restored, ...current.slice(at)];
    },
  };
}

const BREAKPOINT_KEYS = Object.keys(BREAKPOINTS) as Breakpoint[];

function fitRestoredWidget(item: LayoutItem, existing: LayoutItem[], columns: number): LayoutItem {
  const w = Math.min(item.w, columns);
  const next = { ...item, w, x: Math.min(item.x, columns - w) };
  if (next.minW !== undefined) next.minW = Math.min(next.minW, columns);
  if (next.maxW !== undefined) next.maxW = Math.min(next.maxW, columns);
  // При занятой позиции сдвигаем вниз только возвращаемый виджет.
  for (const placed of [...existing].sort((a, b) => a.y - b.y)) {
    if (isRectangleColliding(next, placed)) next.y = placed.y + placed.h;
  }
  return next;
}

const CLOSED_DASHBOARD_UI = { isEditMode: false, isCommandPaletteOpen: false, activeModal: null };
let lastDashboardWrite: string | null = null;

type HydrationStatus = 'loading' | 'ready' | 'error';
let hydrationStatus: HydrationStatus = 'loading';
const hydrationListeners = new Set<() => void>();

function subscribeHydration(listener: () => void) {
  hydrationListeners.add(listener);
  return () => hydrationListeners.delete(listener);
}

function setHydrationStatus(status: HydrationStatus) {
  hydrationStatus = status;
  hydrationListeners.forEach((listener) => listener());
}

export function useDashboardHydration() {
  return useSyncExternalStore(subscribeHydration, () => hydrationStatus);
}

export async function waitForDashboard(): Promise<void> {
  if (hydrationStatus === 'loading') {
    await new Promise<void>((resolve) => {
      const unsubscribe = subscribeHydration(() => {
        if (hydrationStatus === 'loading') return;
        unsubscribe();
        resolve();
      });
    });
  }
  if (hydrationStatus === 'error') throw new Error('Dashboard hydration failed');
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...createDefaultDashboardSnapshot(),
      ...CLOSED_DASHBOARD_UI,

      createSpace: (title, preset = 'empty') => {
        const name = title.trim().slice(0, SPACE_TITLE_LIMIT);
        if (!name) return false;
        const space = createDashboardSpace(name, preset);
        set((state) => ({
          ...CLOSED_DASHBOARD_UI,
          spaces: [...state.spaces, space],
          activeSpaceId: space.id,
        }));
        return true;
      },
      applyOnboardingPreset: (preset) => {
        const state = get();
        const baseline = createDefaultDashboardSnapshot();
        const currentSnapshot = pickPersistedDashboard(state);
        if (stableSnapshot(currentSnapshot) !== stableSnapshot(baseline)) return false;
        const space = createDashboardSpace('home', preset);
        set({
          spaces: [space],
          activeSpaceId: space.id,
          ...(space.layoutMode ? { layoutMode: space.layoutMode } : {}),
          ...CLOSED_DASHBOARD_UI,
        });
        return true;
      },
      switchSpace: (id) => {
        const state = get();
        if (id === state.activeSpaceId || !state.spaces.some((space) => space.id === id)) return;
        set({ ...CLOSED_DASHBOARD_UI, activeSpaceId: id });
      },
      removeSpace: (id) => {
        const state = get();
        if (state.spaces.length <= 1) return;
        const removed = detachEntry(state.spaces, id, (space) => space.id);
        if (!removed) return;
        const { entry, remaining, insert } = removed;
        const next = remaining[0];
        if (!next) return;
        if (id === state.activeSpaceId) {
          set({ ...CLOSED_DASHBOARD_UI, spaces: remaining, activeSpaceId: next.id });
        } else {
          set({ spaces: remaining });
        }
        return {
          title: entry.title,
          restore: () => {
            const { spaces } = get();
            const ids = new Set(entry.instances.map((widget) => widget.instanceId));
            const conflicts = spaces.some(
              (space) =>
                space.id === id || space.instances.some(({ instanceId }) => ids.has(instanceId)),
            );
            if (conflicts) return false;
            set({ spaces: insert(spaces) });
            return true;
          },
        };
      },

      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (val) => set({ isEditMode: val }),
      setLayoutMode: (mode) =>
        set((state) =>
          activeSpaceOf(state).layoutMode
            ? updateActiveSpace(state, () => ({ layoutMode: mode }))
            : { layoutMode: mode },
        ),
      updateHeroSettings: (settings) =>
        set((state) => updateActiveSpace(state, () => ({
          heroSettings: { ...activeHeroSettingsOf(state), ...settings },
        }))),
      setSpaceWallpaper: (value) => {
        const wallpaper = normalizeSpaceWallpaper(value);
        if (value && !wallpaper) return false;
        set((state) => updateActiveSpace(state, () => ({ wallpaper })));
        return true;
      },
      addSpeedDialLink: (link) =>
        set((state) => ({
          speedDialLinks: [
            ...state.speedDialLinks,
            { ...link, id: `sd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        })),
      removeSpeedDialLink: (id) => {
        const removed = detachEntry(get().speedDialLinks, id, (link) => link.id);
        if (!removed) return;
        const { entry, remaining, insert } = removed;
        set({ speedDialLinks: remaining });
        return {
          title: entry.title,
          restore: () => {
            const { speedDialLinks } = get();
            if (speedDialLinks.some((link) => link.id === id)) return false;
            set({ speedDialLinks: insert(speedDialLinks) });
            return true;
          },
        };
      },
      updateSpeedDialLink: (id, link) =>
        set((state) => ({
          speedDialLinks: state.speedDialLinks.map((l) => (l.id === id ? { ...l, ...link } : l)),
        })),
      setCommandPaletteOpen: (val) => set({ isCommandPaletteOpen: val }),
      setBaseColumns: (cols) =>
        set((state) =>
          updateActiveSpace(state, (space) => ({
            baseColumns: cols,
            layouts: deriveResponsiveLayouts(space.layouts.xl, cols),
          })),
        ),
      setGap: (gap) => set((state) => updateActiveSpace(state, () => ({ gap }))),
      setActiveModal: (modal) => set({ activeModal: modal }),

      addWidget: (widgetId, defaultW = 4, defaultH = 3, initialSettings = {}) =>
        set((state) =>
          updateActiveSpace(state, (space) => {
            const instanceId = `${widgetId}-${crypto.randomUUID()}`;
            const cols = space.baseColumns;
            const currentXl = space.layouts.xl;
            const { x, y } = findFirstAvailablePosition(currentXl, cols, defaultW, defaultH);
            const newLayoutItem: LayoutItem = {
              i: instanceId,
              x,
              y,
              w: Math.min(defaultW, cols),
              h: defaultH,
            };
            return {
              instances: [...space.instances, { instanceId, widgetId, settings: initialSettings }],
              layouts: deriveResponsiveLayouts([...currentXl, newLayoutItem], cols),
            };
          }),
        ),

      removeWidget: (instanceId, spaceId = get().activeSpaceId) => {
        const state = get();
        const space = state.spaces.find((space) => space.id === spaceId);
        if (!space) return;
        const removed = detachEntry(space.instances, instanceId, (widget) => widget.instanceId);
        if (!removed) return;
        const { entry, remaining, insert } = removed;
        const layouts = { ...space.layouts };
        const positions = BREAKPOINT_KEYS.flatMap((bp) => {
          const position = detachEntry(layouts[bp], instanceId, (item) => item.i);
          if (!position) return [];
          layouts[bp] = position.remaining;
          return [{ bp, item: position.entry, insertPosition: position.insert }];
        });
        set(updateSpace(state, spaceId, () => ({ instances: remaining, layouts })));
        return {
          title: entry.widgetId,
          restore: () => {
            const current = get();
            const target = current.spaces.find((space) => space.id === spaceId);
            if (
              !target ||
              current.spaces.some((space) =>
                space.instances.some((widget) => widget.instanceId === instanceId),
              )
            )
              return false;
            const layouts = { ...target.layouts };
            for (const { bp, item, insertPosition } of positions) {
              const existing = layouts[bp].filter((item) => item.i !== instanceId);
              const fitted = fitRestoredWidget(
                item,
                existing,
                BREAKPOINT_COLUMNS[target.baseColumns][bp],
              );
              layouts[bp] = insertPosition(existing, fitted);
            }
            set(
              updateSpace(current, spaceId, () => ({
                instances: insert(target.instances),
                layouts,
              })),
            );
            return true;
          },
        };
      },

      updateWidgetSettings: (instanceId, newSettings) => {
        const space = get().spaces.find((space) =>
          space.instances.some((instance) => instance.instanceId === instanceId),
        );
        if (!space) return;
        set((state) => ({
          spaces: state.spaces.map((entry) =>
            entry === space
              ? {
                  ...entry,
                  instances: entry.instances.map((instance) =>
                    instance.instanceId === instanceId
                      ? { ...instance, settings: { ...instance.settings, ...newSettings } }
                      : instance,
                  ),
                }
              : entry,
          ),
        }));
      },

      updateLayout: (breakpoint, items) =>
        set((state) =>
          updateActiveSpace(state, (space) => ({
            layouts: {
              ...space.layouts,
              [breakpoint]: resolveLayoutCollisions(items, space.baseColumns),
            },
          })),
        ),

      resetDashboard: () => set({ ...createDefaultDashboardSnapshot(), ...CLOSED_DASHBOARD_UI }),
    }),
    {
      name: STORAGE_KEYS.DASHBOARD,
      version: 3,
      partialize: pickPersistedDashboard,
      onRehydrateStorage: () => {
        setHydrationStatus('loading');
        return (_state, error) => setHydrationStatus(error ? 'error' : 'ready');
      },
      merge: (persisted, current) =>
        persisted === undefined ? current : { ...current, ...migrateDashboardSnapshot(persisted) },
      migrate: async (persistedState: unknown, version) => {
        if (version === 2) {
          const backup = await StorageAdapter.get(STORAGE_KEYS.DASHBOARD_BACKUP_V2, null);
          if (!backup) {
            await StorageAdapter.set(STORAGE_KEYS.DASHBOARD_BACKUP_V2, {
              state: persistedState,
              version,
            });
          }
        } else if (
          version < 2 &&
          persistedState &&
          typeof persistedState === 'object' &&
          !('version' in persistedState)
        ) {
          await StorageAdapter.set(STORAGE_KEYS.DASHBOARD_BACKUP_V1, persistedState);
        }
        return migrateDashboardSnapshot(persistedState);
      },
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const val = await StorageAdapter.get(name, null);
          lastDashboardWrite = val ? JSON.stringify(val) : null;
          return lastDashboardWrite;
        },
        setItem: async (name, value) => {
          if (value === lastDashboardWrite) return;
          lastDashboardWrite = value;
          try {
            await StorageAdapter.set(name, JSON.parse(value));
          } catch (error) {
            if (lastDashboardWrite === value) lastDashboardWrite = null;
            // Миграция считается завершённой только после записи нового снимка.
            if (hydrationStatus === 'loading') throw error;
            toast.error(t('spaces.saveError'));
          }
        },
        removeItem: async (name) => {
          await StorageAdapter.remove(name);
        },
      })),
    },
  ),
);
