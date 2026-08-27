import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyTheme,
  applyCustomCss,
  applyWallpaper,
  applyFullAppearance,
  clearTheme,
  THEME_STYLE_ID,
  CUSTOM_CSS_STYLE_ID,
} from '@/core/theme/applyTheme';
import { findPreset } from '@/core/theme/presets';
import type { ThemeTokens } from '@/core/theme/tokens';

describe('applyTheme', () => {
  beforeEach(() => {
    clearTheme();
  });

  it('создаёт style-тег dashflow-theme в head и применяет валидные токены', () => {
    const preset = findPreset('neutral-dark')!;
    const ok = applyTheme(preset.tokens);
    expect(ok).toBe(true);

    const styleTag = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('--dashflow-canvas: rgb(11 15 23)');
  });

  it('откатывается на neutral-dark при невалидных токенах', () => {
    const invalidTokens = { canvas: 'not-a-color' } as unknown as ThemeTokens;
    const ok = applyTheme(invalidTokens);
    expect(ok).toBe(false);

    const styleTag = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('--dashflow-canvas: rgb(11 15 23)');
  });

  it('обновляет содержимое существующего style-тега при повторном вызове', () => {
    const dark = findPreset('neutral-dark')!;
    const light = findPreset('default-light')!;

    applyTheme(dark.tokens);
    const tagsCountBefore = document.querySelectorAll(`style#${THEME_STYLE_ID}`).length;
    expect(tagsCountBefore).toBe(1);

    applyTheme(light.tokens);
    const tagsCountAfter = document.querySelectorAll(`style#${THEME_STYLE_ID}`).length;
    expect(tagsCountAfter).toBe(1);

    const styleTag = document.getElementById(THEME_STYLE_ID);
    expect(styleTag?.textContent).toContain('--dashflow-canvas: rgb(245 250 253)');
  });

  it('устанавливает data-theme="light" или "dark" на documentElement', () => {
    const dark = findPreset('neutral-dark')!;
    applyTheme(dark.tokens);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const light = findPreset('default-light')!;
    applyTheme(light.tokens);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('applyCustomCss', () => {
  beforeEach(() => {
    clearTheme();
  });

  it('применяет безопасный пользовательский CSS в тег dashflow-custom-css', () => {
    const css = '.custom-card { border-radius: 8px; }';
    const result = applyCustomCss(css);
    expect(result.ok).toBe(true);

    const styleTag = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toBe(css);
  });

  it('располагает тег custom-css строго после dashflow-theme в head', () => {
    const preset = findPreset('neutral-dark')!;
    applyTheme(preset.tokens);
    applyCustomCss('.my-rule { opacity: 1; }');

    const themeTag = document.getElementById(THEME_STYLE_ID);
    const customTag = document.getElementById(CUSTOM_CSS_STYLE_ID);

    expect(themeTag).not.toBeNull();
    expect(customTag).not.toBeNull();
    // themeTag должен идти перед customTag в DOM
    if (themeTag && customTag) {
      const pos = themeTag.compareDocumentPosition(customTag);
      expect((pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
    }
  });

  it('отклоняет опасный CSS и не применяет его в DOM', () => {
    const badCss = '@import url(https://evil.test/style.css);';
    const result = applyCustomCss(badCss);
    expect(result.ok).toBe(false);

    const styleTag = document.getElementById(CUSTOM_CSS_STYLE_ID);
    expect(styleTag?.textContent).toBe('');
  });

  it('очищает тег при передаче пустой строки', () => {
    applyCustomCss('.rule { color: red; }');
    expect(document.getElementById(CUSTOM_CSS_STYLE_ID)?.textContent).not.toBe('');

    applyCustomCss('');
    expect(document.getElementById(CUSTOM_CSS_STYLE_ID)?.textContent).toBe('');
  });
});

describe('applyWallpaper', () => {
  beforeEach(() => {
    clearTheme();
  });

  it('устанавливает CSS-переменные обоев и scrim на documentElement', () => {
    applyWallpaper('https://images.unsplash.com/photo-1', 0.45);
    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe('url("https://images.unsplash.com/photo-1")');
    expect(document.documentElement.style.getPropertyValue('--app-scrim')).toBe('0.45');
  });

  it('сбрасывает обои на none и scrim на 0 при null', () => {
    applyWallpaper('https://images.unsplash.com/photo-1', 0.45);
    applyWallpaper(null);
    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe('none');
    expect(document.documentElement.style.getPropertyValue('--app-scrim')).toBe('0');
  });
});

describe('applyFullAppearance', () => {
  beforeEach(() => {
    clearTheme();
  });

  it('применяет тему, пользовательский CSS и обои единым вызовом', () => {
    const preset = findPreset('ocean')!;
    applyFullAppearance({
      theme: preset.tokens,
      customCss: '.ocean-accent { color: cyan; }',
      wallpaperUrl: 'https://images.unsplash.com/ocean',
      scrim: 0.2,
    });

    expect(document.getElementById(THEME_STYLE_ID)?.textContent).toContain('--dashflow-canvas: rgb(6 32 38)');
    expect(document.getElementById(CUSTOM_CSS_STYLE_ID)?.textContent).toBe('.ocean-accent { color: cyan; }');
    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe('url("https://images.unsplash.com/ocean")');
    expect(document.documentElement.style.getPropertyValue('--app-scrim')).toBe('0.2');
  });
});

describe('clearTheme', () => {
  it('удаляет теги и очищает стили documentElement', () => {
    const preset = findPreset('midnight')!;
    applyFullAppearance({
      theme: preset.tokens,
      customCss: '.rule { color: purple; }',
      wallpaperUrl: 'https://images.unsplash.com/midnight',
    });

    clearTheme();
    expect(document.getElementById(THEME_STYLE_ID)).toBeNull();
    expect(document.getElementById(CUSTOM_CSS_STYLE_ID)).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--app-scrim')).toBe('');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
