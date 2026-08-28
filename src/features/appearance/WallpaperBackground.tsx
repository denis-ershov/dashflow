import React from 'react';
import { useThemeStore } from '@/core/theme/themeStore';

export const WallpaperBackground: React.FC = () => {
  const wallpaperUrl = useThemeStore((state) => state.wallpaperUrl);
  const scrim = useThemeStore((state) => state.scrim);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[var(--z-base)] overflow-hidden select-none"
    >
      {/* Слой фонового изображения обоев */}
      {wallpaperUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-normal ease-out"
          style={{
            backgroundImage: `url(${wallpaperUrl})`,
          }}
        >
          {/* Слой затемнения (Scrim overlay) */}
          <div
            className="absolute inset-0 transition-opacity duration-normal ease-linear"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${scrim / 100})`,
            }}
          />
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
