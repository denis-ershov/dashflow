import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { useThemeStore } from '@/core/theme/themeStore';
import { Slider } from '@/ui/primitives/Slider';
import { Input } from '@/ui/primitives/Input';
import { Button } from '@/ui/primitives/Button';

const WALLPAPER_PRESETS = [
  {
    name: 'Unsplash Nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80',
  },
  {
    name: 'Dark Mountains',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80',
  },
  {
    name: 'Minimal Gradient',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80',
  },
  {
    name: 'Cosmic Sky',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&q=80',
  },
];

export const WallpaperPicker: React.FC = () => {
  const wallpaperUrl = useThemeStore((state) => state.wallpaperUrl);
  const scrim = useThemeStore((state) => state.scrim);
  const setWallpaper = useThemeStore((state) => state.setWallpaper);
  const setScrim = useThemeStore((state) => state.setScrim);

  const [customUrl, setCustomUrl] = useState('');

  const handleApplyCustom = () => {
    if (customUrl.trim()) {
      setWallpaper(customUrl.trim());
      setCustomUrl('');
    }
  };

  const handleClear = () => {
    setWallpaper(null);
  };

  return (
    <div className="space-y-6">
      {/* Готовые обои */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-secondary" />
          <h4 className="text-sm font-semibold text-fg">Коллекция фонов</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WALLPAPER_PRESETS.map((preset) => {
            const isSelected = wallpaperUrl === preset.url;

            return (
              <button
                key={preset.url}
                type="button"
                onClick={() => setWallpaper(preset.url)}
                aria-label={preset.name}
                className={cn(
                  'h-20 rounded-md border transition-all duration-normal ease-expo overflow-hidden relative flex items-end p-2 cursor-pointer shadow-1 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-line hover:border-line-hover',
                )}
                style={{
                  backgroundImage: `url('${preset.url}')`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }}
              >
                <div className="absolute inset-0 bg-canvas/40 transition-opacity hover:bg-canvas/20" />
                <div className="relative flex items-center justify-between w-full z-[var(--z-raised)]">
                  <span className="text-xs font-semibold text-fg bg-surface/90 px-2 py-1 rounded-sm backdrop-blur-sm truncate">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-fg shrink-0 ml-1">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Пользовательский URL */}
      <div className="space-y-2 pt-4 border-t border-line">
        <label htmlFor="custom-wallpaper-url" className="text-xs font-semibold text-fg">
          Ссылка на собственное изображение
        </label>
        <div className="flex gap-2">
          <Input
            id="custom-wallpaper-url"
            placeholder="https://images.unsplash.com/photo-..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleApplyCustom}
            disabled={!customUrl.trim()}
          >
            Применить
          </Button>
        </div>
      </div>

      {/* Затемнение и сброс */}
      <div className="space-y-4 pt-4 border-t border-line">
        <Slider
          label="Затемнение обоев"
          unit="%"
          min={0}
          max={90}
          step={5}
          value={Math.round(scrim * 100)}
          onChange={(val) => setScrim(val / 100)}
        />

        {wallpaperUrl && (
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4 text-danger" />}
              onClick={handleClear}
            >
              Удалить обои
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
