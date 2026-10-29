import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { PRESETS, type PresetId, type ThemePreset } from '@/core/theme/presets';
import { useThemeStore } from '@/core/theme/themeStore';
import { Badge } from '@/ui/primitives/Badge';

export const PRESET_META: Record<PresetId, { name: string; wcagGrade: 'AA' | 'AAA' }> = {
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
  const setPreset = useThemeStore((state) => state.setPreset);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-muted">{t('themes.intro')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                'flex flex-col p-4 rounded-md border text-left transition-all duration-normal ease-expo cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-1'
                  : 'border-line bg-canvas hover:border-line-hover hover:bg-surface/50',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-fg">{meta.name}</span>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </div>

              <p className="text-xs text-fg-muted mb-3 line-clamp-2">
                {t(`themeDescriptions.${preset.id}`)}
              </p>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-line/50">
                <div className="flex items-center gap-1">
                  <span
                    className="w-4 h-4 rounded-full border border-line shrink-0"
                    style={{ backgroundColor: preset.tokens.canvas }}
                    title="Canvas"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-line shrink-0"
                    style={{ backgroundColor: preset.tokens.surface }}
                    title="Surface"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-line shrink-0"
                    style={{ backgroundColor: preset.tokens.primary }}
                    title="Primary"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-line shrink-0"
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
  );
};
