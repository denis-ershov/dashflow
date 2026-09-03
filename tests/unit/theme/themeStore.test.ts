import { describe, expect, it, beforeEach } from 'vitest';
import { useThemeStore } from '@/core/theme/themeStore';
import { THEME_STYLE_ID, CUSTOM_CSS_STYLE_ID, clearTheme } from '@/core/theme/applyTheme';
import { findPreset } from '@/core/theme/presets';

describe('useThemeStore', () => {
  beforeEach(() => {
    clearTheme();
    useThemeStore.getState().resetTheme();
  });

  it('инициализируется с neutral-dark по умолчанию', () => {
    const state = useThemeStore.getState();
    expect(state.activePresetId).toBe('neutral-dark');
    expect(state.customCss).toBe('');
    expect(state.wallpaperUrl).toBeNull();
    expect(state.scrim).toBe(0.3);
  });

  it('меняет пресет и применяет его стили к DOM', () => {
    useThemeStore.getState().setPreset('ocean');
    expect(useThemeStore.getState().activePresetId).toBe('ocean');

    const styleTag = document.getElementById(THEME_STYLE_ID);
    expect(styleTag?.textContent).toContain('--dashflow-canvas: rgb(6 32 38)');
  });

  it('устанавливает пользовательский CSS и валидирует его', () => {
    const validCss = '.custom-title { font-size: 20px; }';
    const result = useThemeStore.getState().setCustomCss(validCss);
    expect(result.ok).toBe(true);
    expect(useThemeStore.getState().customCss).toBe(validCss);

    const customStyleTag = document.getElementById(CUSTOM_CSS_STYLE_ID);
    expect(customStyleTag?.textContent).toBe(validCss);
  });

  it('отклоняет опасный CSS и не сохраняет его', () => {
    const badCss = '@import url(https://evil.test/style.css);';
    const result = useThemeStore.getState().setCustomCss(badCss);
    expect(result.ok).toBe(false);

    const customStyleTag = document.getElementById(CUSTOM_CSS_STYLE_ID);
    expect(customStyleTag ? customStyleTag.textContent : '').toBe('');
  });

  it('устанавливает и сбрасывает обои со скримом', () => {
    useThemeStore.getState().setWallpaper('https://images.unsplash.com/bg.jpg', 0.5);
    expect(useThemeStore.getState().wallpaperUrl).toBe('https://images.unsplash.com/bg.jpg');
    expect(useThemeStore.getState().scrim).toBe(0.5);

    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe(
      'url("https://images.unsplash.com/bg.jpg")',
    );
    expect(document.documentElement.style.getPropertyValue('--app-scrim')).toBe('0.5');

    useThemeStore.getState().setWallpaper(null);
    expect(useThemeStore.getState().wallpaperUrl).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe('none');
  });

  it('успешно инициализируется из сырого состояния v1 с миграцией', () => {
    const legacyV1 = {
      theme_active_id: 'default-dark',
      theme_bg: {
        value: 'https://images.unsplash.com/old-bg.jpg',
        brightness: 0.6,
      },
      theme_custom_css: '.old { margin: 0; }',
    };

    useThemeStore.getState().initialize(legacyV1);

    const state = useThemeStore.getState();
    expect(state.activePresetId).toBe('deep-blue');
    expect(state.wallpaperUrl).toBe('https://images.unsplash.com/old-bg.jpg');
    expect(state.scrim).toBeCloseTo(0.4, 2);
    expect(state.customCss).toBe('.old { margin: 0; }');
  });

  it('возвращает эффективные токены через getResolvedTokens()', () => {
    useThemeStore.getState().setPreset('midnight');
    const midnightTokens = findPreset('midnight')!.tokens;
    expect(useThemeStore.getState().getEffectiveTokens()).toEqual(midnightTokens);
  });
});
