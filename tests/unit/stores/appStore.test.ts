import { describe, it, expect, afterEach } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';

describe('useAppStore: анимации интерфейса', () => {
  afterEach(async () => {
    await useAppStore.getState().setAnimationsEnabled(true);
  });

  it('выключение анимаций включает режим reduced motion на <html>', async () => {
    await useAppStore.getState().setAnimationsEnabled(false);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');

    await useAppStore.getState().setAnimationsEnabled(true);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
  });
});
