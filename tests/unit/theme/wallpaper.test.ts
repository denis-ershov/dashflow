import { describe, expect, it } from 'vitest';
import {
  ALLOWED_WALLPAPER_SCHEMES,
  DEFAULT_SCRIM,
  buildWallpaperStyle,
  isAllowedWallpaperUrl,
  sanitizeWallpaperUrl,
  validateScrim,
} from '@/core/theme/wallpaper';

describe('ALLOWED_WALLPAPER_SCHEMES', () => {
  it('содержит только безопасные схемы', () => {
    expect(ALLOWED_WALLPAPER_SCHEMES).toEqual(['https', 'data', 'chrome-extension']);
  });
});

describe('isAllowedWallpaperUrl', () => {
  it('принимает https:// URL', () => {
    expect(isAllowedWallpaperUrl('https://images.unsplash.com/photo-123')).toBe(true);
  });

  it('принимает data: URL картинок', () => {
    expect(isAllowedWallpaperUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });

  it('принимает chrome-extension:// URL', () => {
    expect(isAllowedWallpaperUrl('chrome-extension://abcdef/wallpapers/bg.jpg')).toBe(true);
  });

  it('принимает URL в верхнем регистре схем', () => {
    expect(isAllowedWallpaperUrl('HTTPS://EXAMPLE.COM/BG.PNG')).toBe(true);
    expect(isAllowedWallpaperUrl('DATA:IMAGE/JPEG;BASE64,123')).toBe(true);
  });

  it('отклоняет http:// URL', () => {
    expect(isAllowedWallpaperUrl('http://example.com/bg.png')).toBe(false);
  });

  it('отклоняет javascript: URL', () => {
    expect(isAllowedWallpaperUrl('javascript:alert(1)')).toBe(false);
  });

  it('отклоняет file: URL', () => {
    expect(isAllowedWallpaperUrl('file:///etc/passwd')).toBe(false);
  });

  it('отклоняет blob: URL', () => {
    expect(isAllowedWallpaperUrl('blob:https://example.com/uuid')).toBe(false);
  });

  it('отклоняет относительные пути и мусор', () => {
    expect(isAllowedWallpaperUrl('bg.png')).toBe(false);
    expect(isAllowedWallpaperUrl('/images/bg.png')).toBe(false);
    expect(isAllowedWallpaperUrl('//example.com/bg.png')).toBe(false);
    expect(isAllowedWallpaperUrl('')).toBe(false);
    expect(isAllowedWallpaperUrl('   ')).toBe(false);
  });

  it('отклоняет URL с опасными символами кавычек и точек с запятой для CSS-инъекций', () => {
    expect(isAllowedWallpaperUrl('https://example.com/bg.png"); body { display: none; } /*')).toBe(false);
    expect(isAllowedWallpaperUrl("https://example.com/bg.png'); body { color: red; } /*")).toBe(false);
  });
});

describe('sanitizeWallpaperUrl', () => {
  it('возвращает нормализованный URL для валидных схем', () => {
    expect(sanitizeWallpaperUrl('  https://images.unsplash.com/bg.jpg  ')).toBe('https://images.unsplash.com/bg.jpg');
  });

  it('возвращает null для невалидных URL и пустых строк', () => {
    expect(sanitizeWallpaperUrl('http://insecure.test/bg.jpg')).toBeNull();
    expect(sanitizeWallpaperUrl('')).toBeNull();
    expect(sanitizeWallpaperUrl(null)).toBeNull();
    expect(sanitizeWallpaperUrl(undefined)).toBeNull();
    expect(sanitizeWallpaperUrl(123)).toBeNull();
  });
});

describe('validateScrim', () => {
  it('принимает число в диапазоне от 0 до 1', () => {
    expect(validateScrim(0)).toBe(0);
    expect(validateScrim(0.3)).toBe(0.3);
    expect(validateScrim(1)).toBe(1);
    expect(validateScrim(0.65)).toBe(0.65);
  });

  it('ограничивает значения за пределами диапазона [0, 1]', () => {
    expect(validateScrim(-0.5)).toBe(0);
    expect(validateScrim(1.5)).toBe(1);
  });

  it('возвращает дефолтное значение при некорректном вводе', () => {
    expect(validateScrim(undefined)).toBe(DEFAULT_SCRIM);
    expect(validateScrim(null)).toBe(DEFAULT_SCRIM);
    expect(validateScrim(Number.NaN)).toBe(DEFAULT_SCRIM);
    expect(validateScrim('0.5')).toBe(DEFAULT_SCRIM);
  });
});

describe('buildWallpaperStyle', () => {
  it('возвращает none и scrim 0 для пустого или невалидного URL', () => {
    expect(buildWallpaperStyle(null)).toEqual({ bgImage: 'none', scrim: 0 });
    expect(buildWallpaperStyle('')).toEqual({ bgImage: 'none', scrim: 0 });
    expect(buildWallpaperStyle('http://evil.test/bg.jpg')).toEqual({ bgImage: 'none', scrim: 0 });
  });

  it('собирает CSS-значение url(...) и дефолтный scrim 0.3 для валидного URL', () => {
    const result = buildWallpaperStyle('https://images.unsplash.com/bg.jpg');
    expect(result.bgImage).toBe('url("https://images.unsplash.com/bg.jpg")');
    expect(result.scrim).toBe(0.3);
  });

  it('применяет кастомный scrim если указан', () => {
    const result = buildWallpaperStyle('https://images.unsplash.com/bg.jpg', 0.5);
    expect(result.bgImage).toBe('url("https://images.unsplash.com/bg.jpg")');
    expect(result.scrim).toBe(0.5);
  });
});
