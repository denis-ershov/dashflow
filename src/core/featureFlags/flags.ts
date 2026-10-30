import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import type { FeatureFlags, FeatureFlagKey, FeatureFlagDefinition } from './types';

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'ambientAudio',
    defaultValue: true,
  },
  {
    key: 'webVitalsMonitoring',
    defaultValue: true,
  },
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = FEATURE_FLAG_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = def.defaultValue;
  return acc;
}, {} as FeatureFlags);

/** Отбрасывает переопределения удалённых флагов, сохранённые старыми версиями */
function pickKnownFlags(stored: unknown): Partial<FeatureFlags> {
  if (!stored || typeof stored !== 'object') return {};
  const result: Partial<FeatureFlags> = {};
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]) {
    const value = (stored as Record<string, unknown>)[key];
    if (typeof value === 'boolean') result[key] = value;
  }
  return result;
}

class FeatureFlagsManager {
  private overrides: Partial<FeatureFlags> = {};
  private listeners = new Set<(flags: FeatureFlags) => void>();
  private readonly loaded: Promise<void>;

  constructor() {
    this.loaded = this.loadFromStorage();
  }

  /** Резолвится, когда переопределения из хранилища прочитаны */
  public whenReady(): Promise<void> {
    return this.loaded;
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await StorageAdapter.get<Record<string, unknown>>(
        STORAGE_KEYS.FEATURE_FLAGS,
        {},
      );
      this.overrides = pickKnownFlags(stored);
    } catch {
      this.overrides = {};
    } finally {
      this.notifyListeners();
    }
  }

  public isEnabled(key: FeatureFlagKey): boolean {
    if (key in this.overrides) {
      return Boolean(this.overrides[key]);
    }
    return DEFAULT_FEATURE_FLAGS[key] ?? false;
  }

  public getAll(): FeatureFlags {
    return {
      ...DEFAULT_FEATURE_FLAGS,
      ...this.overrides,
    };
  }

  public async setFlag(key: FeatureFlagKey, value: boolean): Promise<void> {
    this.overrides[key] = value;
    this.notifyListeners();
    await StorageAdapter.set(STORAGE_KEYS.FEATURE_FLAGS, this.overrides);
  }

  public async resetAll(): Promise<void> {
    this.overrides = {};
    this.notifyListeners();
    await StorageAdapter.set(STORAGE_KEYS.FEATURE_FLAGS, {});
  }

  public subscribe(callback: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAll());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const current = this.getAll();
    this.listeners.forEach((listener) => listener(current));
  }
}

export const featureFlags = new FeatureFlagsManager();
