import React from 'react';
import { useThemeStore } from '@/core/theme/themeStore';
import { buildWallpaperStyle } from '@/core/theme/wallpaper';
import { activeSpaceOf } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';

/**
 * Явные обои пространства проходят ту же проверку, что и фон темы.
 * Пространство без переопределения использует общие CSS-переменные темы.
 */
export const WallpaperBackground: React.FC = () => {
  const defaultWallpaper = useThemeStore((state) => state.wallpaperUrl);
  const override = useDashboardStore((state) => activeSpaceOf(state).wallpaper);
  const custom = override && buildWallpaperStyle(override.url, override.scrim);
  const hasWallpaper = custom ? custom.bgImage !== 'none' : Boolean(defaultWallpaper);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-(--z-base) overflow-hidden select-none"
    >
      {/* Слой фонового изображения обоев */}
      {hasWallpaper ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-normal ease-out"
          style={{ backgroundImage: custom?.bgImage ?? 'var(--app-bg-image)' }}
        >
          {/* Затемнение всего экрана по настройке пользователя */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-normal ease-linear"
            style={{ opacity: custom?.scrim ?? 'var(--app-scrim)' }}
          />
          {/* Локальная тень за Hero-зоной: приветствие и часы читаются даже на светлом небе */}
          <div className="absolute inset-0 wallpaper-hero-vignette" />
        </div>
      ) : (
        /* Фирменное фоновое свечение темы при отсутствии обоев */
        <div className="absolute inset-0 bg-canvas transition-colors duration-normal">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 blur-3xl rounded-full pointer-events-none" />
        </div>
      )}
    </div>
  );
};
