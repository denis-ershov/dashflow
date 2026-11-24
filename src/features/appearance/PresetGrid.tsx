import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { PRESETS, type PresetId, type ThemePreset } from '@/core/theme/presets';
import { FONT_PRESETS } from '@/core/theme/fonts';
import { RADIUS_SCALE_NAMES, type RadiusScaleName } from '@/core/theme/tokens';
import { useThemeStore } from '@/core/theme/themeStore';
import { Badge } from '@/ui/primitives/Badge';

export const PRESET_META: Record<PresetId, { name: string; wcagGrade: 'AA' | 'AAA' }> = {
  'tactical-dark': {
    name: 'Tactical Dark',
    wcagGrade: 'AAA',
  },
  'neutral-dark': {
    name: 'Neutral Dark',
    wcagGrade: 'AAA',
  },
  'deep-blue': {
    name: 'Deep Blue',
    wcagGrade: 'AA',
  },
  'default-light': {
    name: 'Default Light',
    wcagGrade: 'AA',
  },
  midnight: {
    name: 'Midnight Purple',
    wcagGrade: 'AA',
  },
  ocean: {
    name: 'Ocean Teal',
    wcagGrade: 'AA',
  },
  minimal: {
    name: 'Minimal Monochrome',
    wcagGrade: 'AAA',
  },
  aurora: {
    name: 'Aurora Emerald',
    wcagGrade: 'AA',
  },
  glass: {
    name: 'Glass',
    wcagGrade: 'AA',
  },
  'high-contrast': {
    name: 'High Contrast',
    wcagGrade: 'AAA',
  },
};

export const PresetGrid: React.FC = () => {
  const { t } = useTranslation();
  const activePresetId = useThemeStore((state) => state.activePresetId);
  const fontPreset = useThemeStore((state) => state.fontPreset);
  const radiusScale = useThemeStore((state) => state.radiusScale);
  const setPreset = useThemeStore((state) => state.setPreset);
  const setFontPreset = useThemeStore((state) => state.setFontPreset);
  const setRadiusScale = useThemeStore((state) => state.setRadiusScale);

  return (
    <div className="space-y-6">
      {/* Шрифт и скругления */}
      <div className="grid grid-cols-1 gap-4 rounded-md border border-line bg-canvas/60 p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg">
              {t('themes.fontTitle')}
            </h4>
            <p className="text-xs text-fg-muted">{t('themes.fontHint')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FONT_PRESETS.map((font) => {
              const selected = fontPreset === font.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setFontPreset(font.id)}
                  aria-pressed={selected}
                  style={{ fontFamily: font.family }}
                  className={cn(
                    'min-h-11 rounded-sm border px-3 py-2 text-xs font-medium transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-line bg-surface text-fg hover:border-line-hover hover:bg-surface-hover',
                  )}
                >
                  {font.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-fg">
            {t('themes.radiusTitle')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {RADIUS_SCALE_NAMES.map((scale: RadiusScaleName) => {
              const selected = radiusScale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setRadiusScale(scale)}
                  aria-pressed={selected}
                  className={cn(
                    'min-h-11 rounded-sm border px-3 py-2 text-xs font-medium transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selected
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-line bg-surface text-fg hover:border-line-hover hover:bg-surface-hover',
                  )}
                >
                  {t(`themes.radiusOptions.${scale}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Палитры */}
      <div className="space-y-3">
        <p className="text-xs text-fg-muted">{t('themes.intro')}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((preset: ThemePreset) => {
            const isSelected = activePresetId === preset.id;
            const meta = PRESET_META[preset.id] ?? { name: preset.id, wcagGrade: 'AA' };

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreset(preset.id)}
                aria-label={meta.name}
                aria-pressed={isSelected}
                className={cn(
                  'flex flex-col p-4 rounded-md border text-left transition-colors duration-fast cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected
                    ? 'border-primary border-l-2 bg-surface'
                    : 'border-line bg-canvas hover:border-line-hover hover:bg-surface/60',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-fg">{meta.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>

                <p className="text-xs text-fg-muted mb-3 line-clamp-2">
                  {t(`themeDescriptions.${preset.id}`)}
                </p>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-line/60">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-4 h-4 rounded-xs border border-line shrink-0"
                      style={{ backgroundColor: preset.tokens.canvas }}
                      title="Canvas"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-line shrink-0"
                      style={{ backgroundColor: preset.tokens.surface }}
                      title="Surface"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-line shrink-0"
                      style={{ backgroundColor: preset.tokens.primary }}
                      title="Primary"
                    />
                    <span
                      className="w-4 h-4 rounded-xs border border-line shrink-0"
                      style={{ backgroundColor: preset.tokens.secondary }}
                      title="Secondary"
                    />
                  </div>

                  <Badge variant={meta.wcagGrade === 'AAA' ? 'success' : 'default'}>
                    {meta.wcagGrade}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
