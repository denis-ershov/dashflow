import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import type { FeatureFlags, FeatureFlagKey, FeatureFlagDefinition } from './types';

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'aiSearchEngines',
    title: 'AI-поисковые системы',
    description: 'Интеграция ChatGPT, Claude, Perplexity AI и Brave Search в строку поиска',
    defaultValue: true,
  },
  {
    key: 'ambientAudio',
    title: 'Звуки окружения (Ambient Audio)',
    description: 'Фоновые процедурные звуковые генераторы (дождь, костер, волны, белый шум)',
    defaultValue: true,
  },
  {
    key: 'systemMonitorBars',
    title: 'Детальные шкалы системного монитора',
    description: 'Режим отображения горизонтальных прогресс-баров батареи и оперативной памяти',
    defaultValue: true,
  },
  {
    key: 'webVitalsMonitoring',
    title: 'Мониторинг Core Web Vitals',
    description: 'Локальный замер показателей скорости загрузки (LCP, CLS, INP) новой вкладки',
    defaultValue: true,
  },
  {
    key: 'offlineIndicator',
    title: 'Индикатор автономного режима',
    description: 'Визуальный бейдж при временном отключении от сети Интернет',
    defaultValue: true,
  },
  {
    key: 'experimentalPlugins',
    title: 'Пользовательские плагины (Beta)',
    description: 'Загрузка и песочница сторонних декларативных виджетов',
    defaultValue: false,
    isExperimental: true,
  },
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = FEATURE_FLAG_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.key] = def.defaultValue;
    return acc;
  },
  {} as FeatureFlags,
);

class FeatureFlagsManager {
  private overrides: Partial<FeatureFlags> = {};
  private listeners = new Set<(flags: FeatureFlags) => void>();
  private isLoaded = false;

  constructor() {
    void this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const stored = await StorageAdapter.get<Partial<FeatureFlags>>(STORAGE_KEYS.FEATURE_FLAGS, {});
      if (stored && typeof stored === 'object') {
        this.overrides = stored;
      }
    } catch {
      this.overrides = {};
    } finally {
      this.isLoaded = true;
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
