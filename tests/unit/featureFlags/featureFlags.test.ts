import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags } from '@/core/featureFlags/flags';

describe('FeatureFlags: Manager', () => {
  beforeEach(async () => {
    await featureFlags.resetAll();
  });

  it('должен возвращать дефолтные значения флагов', () => {
    expect(featureFlags.isEnabled('ambientAudio')).toBe(true);
    expect(featureFlags.isEnabled('webVitalsMonitoring')).toBe(true);
  });

  it('должен позволять переопределять флаг и уведомлять подписчиков', async () => {
    let notifiedVal = true;
    const unsubscribe = featureFlags.subscribe((flags) => {
      notifiedVal = flags.ambientAudio;
    });

    await featureFlags.setFlag('ambientAudio', false);
    expect(featureFlags.isEnabled('ambientAudio')).toBe(false);
    expect(notifiedVal).toBe(false);

    unsubscribe();
  });

  it('должен сбрасывать все переопределения до дефолтных', async () => {
    await featureFlags.setFlag('webVitalsMonitoring', false);
    expect(featureFlags.isEnabled('webVitalsMonitoring')).toBe(false);

    await featureFlags.resetAll();
    expect(featureFlags.isEnabled('webVitalsMonitoring')).toBe(true);
  });

  it('должен возвращать полный снимок всех флагов через getAll', () => {
    const all = featureFlags.getAll();
    expect(Object.keys(all).sort()).toEqual(['ambientAudio', 'webVitalsMonitoring']);
  });
});
