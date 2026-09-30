import { describe, it, expect, beforeEach } from 'vitest';
import { featureFlags } from '@/core/featureFlags/flags';

describe('FeatureFlags: Manager', () => {
  beforeEach(async () => {
    await featureFlags.resetAll();
  });

  it('должен возвращать дефолтные значения флагов', () => {
    expect(featureFlags.isEnabled('aiSearchEngines')).toBe(true);
    expect(featureFlags.isEnabled('ambientAudio')).toBe(true);
    expect(featureFlags.isEnabled('experimentalPlugins')).toBe(false);
  });

  it('должен позволять переопределять флаг и уведомлять подписчиков', async () => {
    let notifiedVal = false;
    const unsubscribe = featureFlags.subscribe((flags) => {
      notifiedVal = flags.experimentalPlugins;
    });

    await featureFlags.setFlag('experimentalPlugins', true);
    expect(featureFlags.isEnabled('experimentalPlugins')).toBe(true);
    expect(notifiedVal).toBe(true);

    unsubscribe();
  });

  it('должен сбрасывать все переопределения до дефолтных', async () => {
    await featureFlags.setFlag('aiSearchEngines', false);
    expect(featureFlags.isEnabled('aiSearchEngines')).toBe(false);

    await featureFlags.resetAll();
    expect(featureFlags.isEnabled('aiSearchEngines')).toBe(true);
  });

  it('должен возвращать полный снимок всех флагов через getAll', () => {
    const all = featureFlags.getAll();
    expect(all).toHaveProperty('aiSearchEngines');
    expect(all).toHaveProperty('ambientAudio');
    expect(all).toHaveProperty('systemMonitorBars');
    expect(all).toHaveProperty('webVitalsMonitoring');
  });
});
