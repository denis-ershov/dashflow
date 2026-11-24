import { deriveResponsiveLayouts, type LayoutItem } from './dashboardMigrations';
import type { DashboardSpace } from './dashboardSpaces';

export const SPACE_PRESETS = ['empty', 'morning', 'focus'] as const;
export type SpacePreset = (typeof SPACE_PRESETS)[number];

type PresetWidget = Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> & { widgetId: string };

const PRESET_LAYOUTS: Record<
  SpacePreset,
  { layoutMode?: DashboardSpace['layoutMode']; widgets: PresetWidget[] }
> = {
  empty: { widgets: [] },
  morning: {
    layoutMode: 'modular',
    widgets: [
      { widgetId: 'digest', x: 0, y: 0, w: 6, h: 5 },
      { widgetId: 'agenda', x: 6, y: 0, w: 6, h: 5 },
    ],
  },
  focus: {
    layoutMode: 'canvas',
    widgets: [
      { widgetId: 'todo', x: 0, y: 0, w: 8, h: 6 },
      { widgetId: 'pomodoro', x: 8, y: 0, w: 4, h: 4 },
    ],
  },
};

export function createDashboardSpace(title: string, preset: SpacePreset): DashboardSpace {
  const { layoutMode, widgets } = PRESET_LAYOUTS[preset];
  const layout: LayoutItem[] = [];
  const instances = widgets.map(({ widgetId, ...position }) => {
    const instanceId = `${widgetId}-${crypto.randomUUID()}`;
    layout.push({ i: instanceId, ...position });
    return { instanceId, widgetId, settings: {} };
  });
  return {
    id: crypto.randomUUID(),
    title,
    instances,
    layouts: deriveResponsiveLayouts(layout),
    baseColumns: 12,
    gap: 16,
    ...(layoutMode ? { layoutMode } : {}),
  };
}
