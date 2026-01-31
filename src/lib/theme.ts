/**
 * Theme switcher logic.
 * Applies theme to document, resolves system preference, persists via settings.
 */

import type { ThemeMode, ThemeOverrides } from '@/types/dashboard';
import { useSettingsStore } from '@/stores';

const THEME_ATTR = 'data-theme';
const CUSTOM_ATTR = 'data-theme-custom';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

/** Apply theme to document root */
export function applyTheme(
  mode: ThemeMode,
  overrides?: ThemeOverrides
): void {
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;

  root.setAttribute(THEME_ATTR, effective);

  if (overrides && Object.keys(overrides).length > 0) {
    root.setAttribute(CUSTOM_ATTR, 'true');
    if (overrides.background) root.style.setProperty('--color-bg', overrides.background);
    if (overrides.surface) root.style.setProperty('--color-surface', overrides.surface);
    if (overrides.text) root.style.setProperty('--color-text', overrides.text);
    if (overrides.textMuted) root.style.setProperty('--color-text-muted', overrides.textMuted);
    if (overrides.border) root.style.setProperty('--color-border', overrides.border);
    if (overrides.primary) root.style.setProperty('--color-primary', overrides.primary);
  } else {
    root.removeAttribute(CUSTOM_ATTR);
    root.style.removeProperty('--color-bg');
    root.style.removeProperty('--color-surface');
    root.style.removeProperty('--color-text');
    root.style.removeProperty('--color-text-muted');
    root.style.removeProperty('--color-border');
    root.style.removeProperty('--color-primary');
  }
}

/** Subscribe to settings and apply theme on change */
export function initTheme(): () => void {
  const { theme, themeOverrides } = useSettingsStore.getState();
  applyTheme(theme, themeOverrides);

  const unsub = useSettingsStore.subscribe((state) => {
    applyTheme(state.theme, state.themeOverrides);
  });

  // Listen for system preference changes when mode is 'system'
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (useSettingsStore.getState().theme === 'system') {
      applyTheme('system', useSettingsStore.getState().themeOverrides);
    }
  };
  mq.addEventListener('change', handleChange);

  return () => {
    unsub();
    mq.removeEventListener('change', handleChange);
  };
}
