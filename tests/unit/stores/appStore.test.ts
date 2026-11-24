import { describe, it, expect, afterEach } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { STORAGE_KEYS } from '@/core/storage/keys';

describe('useAppStore: анимации интерфейса', () => {
  afterEach(async () => {
    await useAppStore.getState().setAnimationsEnabled(true);
    await useAppStore.getState().setDensity('comfortable');
    localStorage.removeItem(STORAGE_KEYS.APP_DENSITY);
  });

  it('выключение анимаций включает режим reduced motion на <html>', async () => {
    await useAppStore.getState().setAnimationsEnabled(false);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');

    await useAppStore.getState().setAnimationsEnabled(true);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });

  it('сохраняет выбранную плотность и применяет её к документу', async () => {
    await useAppStore.getState().setDensity('compact');

    expect(useAppStore.getState().density).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_DENSITY) ?? 'null')).toBe('compact');

    await useAppStore.getState().setDensity('comfortable');

    expect(useAppStore.getState().density).toBe('comfortable');
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.APP_DENSITY) ?? 'null')).toBe(
      'comfortable',
    );
  });

  it('загружает компактную плотность при инициализации', async () => {
    localStorage.setItem(STORAGE_KEYS.APP_DENSITY, JSON.stringify('compact'));

    await useAppStore.getState().initialize();

    expect(useAppStore.getState().density).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });
});
