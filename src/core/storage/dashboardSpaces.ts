import { asArray, asNumber, asRecord, asString } from '@/core/network/jsonReaders';
import { getSearchEngine } from '@/core/search';
import { sanitizeWallpaperUrl, validateScrim } from '@/core/theme/wallpaper';
import {
  BREAKPOINTS,
  BREAKPOINT_COLUMNS,
  DEFAULT_HERO_SETTINGS,
  createDefaultDashboardState,
  deriveResponsiveLayouts,
  migrateDashboardState,
  type Breakpoint,
  type LayoutItem,
  type MigratedDashboardState,
  type HeroSettings,
} from './dashboardMigrations';

export const DEFAULT_SPACE_ID = 'home';
export const SPACE_TITLE_LIMIT = 80;
const MAX_GRID_ROWS = 10_000;
const BREAKPOINT_KEYS = Object.keys(BREAKPOINTS) as Breakpoint[];

export interface DashboardSpace extends Pick<
  MigratedDashboardState,
  'instances' | 'layouts' | 'baseColumns' | 'gap'
> {
  id: string;
  title: string;
  icon?: string;
  layoutMode?: MigratedDashboardState['layoutMode'];
  heroSettings?: HeroSettings;
  wallpaper?: SpaceWallpaper;
}

export interface SpaceWallpaper {
  url: string | null;
  scrim: number;
}

const heroToggles = [
  'showSeconds',
  'showDate',
  'showClock',
  'showGreeting',
  'showYearProgress',
  'showSearchBar',
  'showSpeedDial',
] as const;
const clockStyles = ['digital', 'minimal', 'serif', 'flip', 'mono'] as const;
const alignments = ['left', 'center', 'right'] as const;

function readSpaceHero(value: unknown): HeroSettings | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
  const raw = asRecord(value);
  const settings: HeroSettings = { ...DEFAULT_HERO_SETTINGS };
  for (const key of heroToggles) {
    const toggle = raw[key];
    if (typeof toggle === 'boolean') settings[key] = toggle;
  }
  settings.clockStyle =
    clockStyles.find((candidate) => candidate === raw.clockStyle) ?? settings.clockStyle;
  settings.alignment =
    alignments.find((candidate) => candidate === raw.alignment) ?? settings.alignment;
  if (raw.timeFormat === '12h' || raw.timeFormat === '24h') settings.timeFormat = raw.timeFormat;
  if (typeof raw.userName === 'string') settings.userName = raw.userName.slice(0, 100);
  settings.defaultSearchEngine = getSearchEngine(asString(raw.defaultSearchEngine)).id;
  return settings;
}

export function normalizeSpaceWallpaper(value: unknown): SpaceWallpaper | undefined {
  const raw = asRecord(value);
  const url = sanitizeWallpaperUrl(raw.url);
  if (!url && raw.url !== null) return;
  return { url, scrim: validateScrim(raw.scrim) };
}

export interface DashboardSnapshot extends Pick<
  MigratedDashboardState,
  'layoutMode' | 'heroSettings' | 'speedDialLinks'
> {
  version: 3;
  activeSpaceId: string;
  spaces: DashboardSpace[];
}

function initialSnapshot(
  legacy: MigratedDashboardState,
  layout: DashboardSpace = { ...pickLayout(legacy), id: DEFAULT_SPACE_ID, title: '' },
): DashboardSnapshot {
  const { layoutMode, heroSettings, speedDialLinks } = legacy;
  return {
    version: 3,
    activeSpaceId: layout.id,
    spaces: [layout],
    layoutMode,
    heroSettings,
    speedDialLinks,
  };
}

function pickLayout({ instances, layouts, baseColumns, gap }: MigratedDashboardState) {
  return { instances, layouts, baseColumns, gap };
}

export function createDefaultDashboardSnapshot(): DashboardSnapshot {
  return initialSnapshot(createDefaultDashboardState());
}

function readSpace(value: unknown, seenInstances: Set<string>): DashboardSpace | undefined {
  const raw = asRecord(value);
  const id = asString(raw.id);
  if (!id || !Array.isArray(raw.instances) || !Array.isArray(asRecord(raw.layouts).xl)) return;
  const baseColumns = raw.baseColumns === 16 || raw.baseColumns === 24 ? raw.baseColumns : 12;
  const instanceIds = new Set<string>();
  const instances = raw.instances.flatMap((value) => {
    const widget = asRecord(value);
    const instanceId = asString(widget.instanceId);
    const widgetId = asString(widget.widgetId);
    if (!instanceId || !widgetId || seenInstances.has(instanceId)) return [];
    seenInstances.add(instanceId);
    instanceIds.add(instanceId);
    return [{ instanceId, widgetId, settings: asRecord(widget.settings) }];
  });
  const rawLayouts = asRecord(raw.layouts);
  const readLayout = (bp: Breakpoint): LayoutItem[] => {
    const cols = BREAKPOINT_COLUMNS[baseColumns][bp];
    const seen = new Set<string>();
    return asArray(rawLayouts[bp]).flatMap((value) => {
      const item = asRecord(value);
      const i = asString(item.i);
      if (!i || !instanceIds.has(i) || seen.has(i)) return [];
      seen.add(i);
      const w = Math.max(1, Math.min(cols, asNumber(item.w) ?? 4));
      return [
        {
          i,
          w,
          x: Math.max(0, Math.min(cols - w, asNumber(item.x) ?? 0)),
          y: Math.max(0, Math.min(MAX_GRID_ROWS, asNumber(item.y) ?? 0)),
          h: Math.max(1, Math.min(MAX_GRID_ROWS, asNumber(item.h) ?? 2)),
          minW: asNumber(item.minW),
          minH: asNumber(item.minH),
          maxW: asNumber(item.maxW),
          maxH: asNumber(item.maxH),
        },
      ];
    });
  };
  const layouts = {
    xl: readLayout('xl'),
    lg: readLayout('lg'),
    md: readLayout('md'),
    sm: readLayout('sm'),
    xs: readLayout('xs'),
  };
  // В старом формате некоторые адаптивные раскладки могли отсутствовать.
  const missing = BREAKPOINT_KEYS.filter((bp) => !Array.isArray(rawLayouts[bp]));
  if (missing.length > 0) {
    const derived = deriveResponsiveLayouts(layouts.xl, baseColumns);
    for (const bp of missing) layouts[bp] = derived[bp];
  }
  const { layoutMode } = raw;
  const heroSettings = readSpaceHero(raw.heroSettings);
  const wallpaper = normalizeSpaceWallpaper(raw.wallpaper);
  return {
    id,
    instances,
    layouts,
    baseColumns,
    title: typeof raw.title === 'string' ? raw.title.trim().slice(0, SPACE_TITLE_LIMIT) : '',
    icon: asString(raw.icon)?.slice(0, 16),
    gap: Math.max(0, Math.min(64, asNumber(raw.gap) ?? 16)),
    ...(heroSettings ? { heroSettings } : {}),
    ...(wallpaper ? { wallpaper } : {}),
    ...(layoutMode === 'zen' || layoutMode === 'modular' || layoutMode === 'canvas'
      ? { layoutMode }
      : {}),
  };
}

/** Читает v3, старый снимок v2 и ранний формат widgets. */
export function migrateDashboardSnapshot(value: unknown): DashboardSnapshot {
  const raw = asRecord(value);
  const legacy = migrateDashboardState({
    ...raw,
    version: 2,
    // Данные сетки v2 читаются отдельно, чтобы сохранить ручные раскладки для всех ширин.
    instances: Array.isArray(raw.instances) || Array.isArray(raw.spaces) ? [] : undefined,
    layouts: { xl: [] },
  });
  const snapshot = initialSnapshot(legacy);
  const seenInstances = new Set<string>();
  const spaces = new Map<string, DashboardSpace>();
  for (const entry of asArray(raw.spaces)) {
    const id = asString(asRecord(entry).id);
    if (!id || spaces.has(id)) continue;
    const space = readSpace(entry, seenInstances);
    if (space) spaces.set(id, space);
  }
  const firstSpace = spaces.values().next().value;
  if (firstSpace) {
    const requested = asString(raw.activeSpaceId);
    return {
      ...snapshot,
      activeSpaceId: requested && spaces.has(requested) ? requested : firstSpace.id,
      spaces: [...spaces.values()],
    };
  }

  const home = readSpace(
    {
      ...raw,
      id: DEFAULT_SPACE_ID,
      title: '',
      layoutMode: undefined,
      heroSettings: undefined,
      wallpaper: undefined,
    },
    new Set(),
  );
  return initialSnapshot(legacy, home);
}

export function activeSpaceOf(state: DashboardSnapshot): DashboardSpace {
  const space = state.spaces.find(({ id }) => id === state.activeSpaceId);
  if (!space) throw new Error('Invalid activeSpaceId');
  return space;
}

export function activeLayoutModeOf(state: DashboardSnapshot): DashboardSnapshot['layoutMode'] {
  return activeSpaceOf(state).layoutMode ?? state.layoutMode;
}

export function activeHeroSettingsOf(state: DashboardSnapshot): HeroSettings {
  return activeSpaceOf(state).heroSettings ?? state.heroSettings;
}

/** Экспорт 3.0: полный снимок и плоская копия активной сетки для импорта в 3.8. */
export function exportDashboardSnapshot(state: DashboardSnapshot) {
  const { instances, layouts, baseColumns, gap } = activeSpaceOf(state);
  return { ...state, version: 2, instances, layouts, baseColumns, gap };
}
