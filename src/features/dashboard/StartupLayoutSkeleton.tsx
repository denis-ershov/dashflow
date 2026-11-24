import type { StartupLayoutCache } from './startupLayoutCache';

interface StartupLayoutSkeletonProps {
  layout: StartupLayoutCache;
  label: string;
}

export function StartupLayoutSkeleton({ layout, label }: StartupLayoutSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="min-h-screen bg-canvas px-4 pb-36 pt-8 text-fg sm:px-8"
      role="status"
    >
      {layout.mode !== 'canvas' && (
        <div className="mx-auto mb-8 flex w-full max-w-5xl flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse motion-reduce:animate-none h-9 w-48 rounded-lg bg-surface" />
          <div className="motion-safe:animate-pulse motion-reduce:animate-none h-11 w-full max-w-2xl rounded-xl bg-surface" />
        </div>
      )}
      {layout.mode !== 'zen' && layout.widgetCount > 0 && (
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 sm:hidden" aria-hidden="true">
          {layout.geometry.map(({ h }, index) => (
            <div
              className="motion-safe:animate-pulse motion-reduce:animate-none rounded-xl border border-line bg-surface/70"
              key={index}
              style={{ minHeight: `${Math.max(56, Math.min(192, h * 48))}px` }}
            />
          ))}
        </div>
      )}
      {layout.mode !== 'zen' && layout.widgetCount > 0 && (
        <div
          className="mx-auto hidden w-full max-w-7xl grid-cols-12 gap-3 sm:grid sm:gap-4"
          aria-hidden="true"
        >
          {layout.geometry.map(({ x, y, w, h }, index) => (
            <div
              className="motion-safe:animate-pulse motion-reduce:animate-none rounded-xl border border-line bg-surface/70"
              key={index}
              style={{
                gridColumn: `${x + 1} / span ${Math.min(w, 12 - x)}`,
                gridRow: `${y + 1} / span ${Math.min(h, 6)}`,
                minHeight: `${Math.max(56, Math.min(192, h * 48))}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
