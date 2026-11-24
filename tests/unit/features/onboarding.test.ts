import { beforeEach, describe, expect, it } from 'vitest';
import {
  shouldShowOnboarding,
  finishOnboarding,
  ONBOARDING_STORAGE_KEY,
} from '@/features/onboarding/onboarding';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { activeSpaceOf } from '@/core/storage';

describe('first-run onboarding', () => {
  beforeEach(() => {
    useDashboardStore.getState().resetDashboard();
    useAppStore.setState({ city: '', language: 'ru' });
    localStorage.clear();
  });

  it('is offered only for an empty new profile', async () => {
    expect(await shouldShowOnboarding()).toBe(true);

    await StorageAdapter.set(STORAGE_KEYS.DASHBOARD, { state: { version: 3 }, version: 3 });
    expect(await shouldShowOnboarding()).toBe(false);
  });

  it('does not block a profile with legacy user content', async () => {
    await StorageAdapter.set(STORAGE_KEYS.NOTES_CONTENT, [{ id: 'note-1', text: 'Existing note' }]);
    expect(await shouldShowOnboarding()).toBe(false);
  });

  it('seeds a selected preset once, stores the city and dismisses the flow', async () => {
    expect(await finishOnboarding({ accepted: true, preset: 'focus', city: '  Riga  ' })).toBe(
      true,
    );
    expect(
      activeSpaceOf(useDashboardStore.getState()).instances.map(({ widgetId }) => widgetId),
    ).toEqual(['todo', 'pomodoro']);
    expect(useAppStore.getState().city).toBe('Riga');
    expect(await StorageAdapter.get(ONBOARDING_STORAGE_KEY, null)).toEqual({
      dismissed: true,
      city: 'Riga',
    });
    expect(await shouldShowOnboarding()).toBe(false);
    expect(await finishOnboarding({ accepted: true, preset: 'morning', city: '' })).toBe(false);
  });

  it('does not replace a layout changed before acceptance', async () => {
    useDashboardStore.getState().addWidget('quotes');
    expect(await finishOnboarding({ accepted: true, preset: 'focus', city: '' })).toBe(false);
    expect(
      activeSpaceOf(useDashboardStore.getState()).instances.some(
        ({ widgetId }) => widgetId === 'quotes',
      ),
    ).toBe(true);
    expect(await shouldShowOnboarding()).toBe(false);
  });

  it('skip dismisses without applying a preset or city', async () => {
    const before = activeSpaceOf(useDashboardStore.getState());
    expect(await finishOnboarding({ accepted: false, preset: 'focus', city: 'Riga' })).toBe(true);
    expect(activeSpaceOf(useDashboardStore.getState())).toBe(before);
    expect(useAppStore.getState().city).toBe('');
  });
});
