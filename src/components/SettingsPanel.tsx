import { useEffect, useRef, useCallback } from 'react';
import { useUIStore, useSettingsStore, useLayoutStore, useWidgetsStore } from '@/stores';
import type { ThemeMode } from '@/types/dashboard';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function SettingsPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const open = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const close = useCallback(() => {
    setSidebarOpen(false);
    previousFocusRef.current?.focus();
  }, [setSidebarOpen]);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const grid = useSettingsStore((s) => s.grid);
  const setGridSettings = useSettingsStore((s) => s.setGridSettings);
  const resetSettings = useSettingsStore((s) => s.reset);

  const setLayoutGrid = useLayoutStore((s) => s.setGridConfig);
  const resetLayout = useLayoutStore((s) => s.reset);
  const resetWidgets = useWidgetsStore((s) => s.reset);

  const handleGridChange = (updates: Partial<typeof grid>) => {
    const next = { ...grid, ...updates };
    setGridSettings(next);
    setLayoutGrid({ cols: next.cols, rowHeight: next.rowHeight });
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings, layout, and widgets to defaults?')) {
      resetSettings();
      resetLayout();
      resetWidgets();
      close();
    }
  };

  // Store previous focus and focus trap
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const el = panelRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  // Prevent scroll on body when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={close}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-[var(--color-bg-elevated)] border-l border-[var(--color-border)] shadow-xl z-50 flex flex-col"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
          <h2 id="settings-title" className="text-lg font-semibold text-[var(--color-text)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Theme */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
              Theme
            </h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Theme selection">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`
                    px-3 py-2 text-sm rounded-lg transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-elevated)]
                    ${theme === opt.value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Grid */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
              Grid
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="settings-cols"
                  className="block text-xs text-[var(--color-text-muted)] mb-1"
                >
                  Columns
                </label>
                <input
                  id="settings-cols"
                  type="number"
                  min={4}
                  max={24}
                  value={grid.cols}
                  onChange={(e) =>
                    handleGridChange({ cols: Math.max(4, Math.min(24, Number(e.target.value) || 12)) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label
                  htmlFor="settings-row-height"
                  className="block text-xs text-[var(--color-text-muted)] mb-1"
                >
                  Row height (px)
                </label>
                <input
                  id="settings-row-height"
                  type="number"
                  min={20}
                  max={120}
                  value={grid.rowHeight}
                  onChange={(e) =>
                    handleGridChange({
                      rowHeight: Math.max(20, Math.min(120, Number(e.target.value) || 60)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </section>

          {/* Reset */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
              Reset
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="w-full px-4 py-2 text-sm rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Reset to defaults
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
