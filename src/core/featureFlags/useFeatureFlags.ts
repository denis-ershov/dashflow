import { useState, useEffect } from 'react';
import { featureFlags } from './flags';
import type { FeatureFlags, FeatureFlagKey } from './types';

export function useFeatureFlags(): {
  flags: FeatureFlags;
  isEnabled: (key: FeatureFlagKey) => boolean;
  setFlag: (key: FeatureFlagKey, value: boolean) => Promise<void>;
  resetAll: () => Promise<void>;
} {
  const [flags, setFlags] = useState<FeatureFlags>(() => featureFlags.getAll());

  useEffect(() => {
    return featureFlags.subscribe(setFlags);
  }, []);

  return {
    flags,
    isEnabled: (key: FeatureFlagKey) => Boolean(flags[key]),
    setFlag: (key: FeatureFlagKey, value: boolean) => featureFlags.setFlag(key, value),
    resetAll: () => featureFlags.resetAll(),
  };
}
