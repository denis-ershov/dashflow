/**
 * Каталог локальных шрифтов интерфейса.
 * Все встроенные шрифты поставляются локально внутри расширения (без CDN)
 * и поддерживают кириллицу и латиницу с едиными метриками.
 */

export const FONT_PRESET_IDS = ['sofia-sans', 'inter', 'jura', 'ibm-plex-mono', 'system'] as const;

export type FontPresetId = (typeof FONT_PRESET_IDS)[number];

export interface FontPreset {
  id: FontPresetId;
  label: string;
  family: string;
}

export const DEFAULT_FONT_PRESET_ID: FontPresetId = 'sofia-sans';

export const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: 'sofia-sans',
    label: 'Sofia Sans',
    family: "'Sofia Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'inter',
    label: 'Inter',
    family: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'jura',
    label: 'Jura',
    family: "'Jura Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    family: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  {
    id: 'system',
    label: 'System UI',
    family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
];

export const DEFAULT_FONT_MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export function isFontPresetId(value: unknown): value is FontPresetId {
  return typeof value === 'string' && (FONT_PRESET_IDS as readonly string[]).includes(value);
}

export function findFontPreset(id: string): FontPreset {
  return FONT_PRESETS.find((preset) => preset.id === id) ?? FONT_PRESETS[0]!;
}
