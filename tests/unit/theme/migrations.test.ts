import { describe, expect, it } from 'vitest';
import {
  CURRENT_THEME_VERSION,
  DEFAULT_THEME_STATE,
  migrateThemeState,
  type ThemeStateV2,
} from '@/core/theme/migrations';

describe('migrateThemeState', () => {
  it('возвращает дефолтное состояние v2 для null / undefined', () => {
    expect(migrateThemeState(null)).toEqual(DEFAULT_THEME_STATE);
    expect(migrateThemeState(undefined)).toEqual(DEFAULT_THEME_STATE);
    expect(migrateThemeState('string')).toEqual(DEFAULT_THEME_STATE);
  });

  it('сохраняет уже мигрированное состояние v2', () => {
    const v2State: ThemeStateV2 = {
      version: CURRENT_THEME_VERSION,
      activePresetId: 'ocean',
      customTokens: undefined,
      customCss: '.card { color: blue; }',
      allowExternalCss: false,
      wallpaperUrl: 'https://images.unsplash.com/photo-1',
      scrim: 0.4,
    };

    expect(migrateThemeState(v2State)).toEqual(v2State);
  });

  it('мигрирует v1 тему "default-dark" в "deep-blue" (сохраняя привычный вид)', () => {
    const v1 = {
      theme_active_id: 'default-dark',
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.version).toBe(2);
    expect(migrated.activePresetId).toBe('deep-blue');
  });

  it('мигрирует v1 пресеты с сохранением id', () => {
    const v1 = {
      activePresetId: 'midnight',
      theme_custom_css: '.title { font-weight: bold; }',
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.activePresetId).toBe('midnight');
    expect(migrated.customCss).toBe('.title { font-weight: bold; }');
  });

  it('мигрирует v1 объект обоев theme_bg', () => {
    const v1 = {
      activePresetId: 'neutral-dark',
      theme_bg: {
        type: 'custom',
        value: 'https://images.unsplash.com/custom-bg.jpg',
        brightness: 0.7,
      },
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.wallpaperUrl).toBe('https://images.unsplash.com/custom-bg.jpg');
    // brightness 0.7 -> scrim 0.3 (1 - 0.7)
    expect(migrated.scrim).toBeCloseTo(0.3, 2);
  });

  it('отбрасывает небезопасный URL обоев при миграции v1', () => {
    const v1 = {
      theme_bg: {
        value: 'http://insecure.test/bg.jpg',
      },
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.wallpaperUrl).toBeNull();
  });

  it('отбрасывает небезопасный customCss при миграции v1', () => {
    const v1 = {
      theme_custom_css: '@import url(https://evil.test/x.css);',
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.customCss).toBe('');
  });

  it('откатывается на neutral-dark для неизвестных пресетов', () => {
    const v1 = {
      activePresetId: 'non-existent-preset-123',
    };

    const migrated = migrateThemeState(v1);
    expect(migrated.activePresetId).toBe('neutral-dark');
  });
});
