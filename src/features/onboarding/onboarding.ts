import { StorageAdapter, STORAGE_KEYS, userContentKeys } from '@/core/storage';
import { useAppStore } from '@/stores/useAppStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { SpacePreset } from '@/core/storage';

export const ONBOARDING_STORAGE_KEY = 'dashflow_onboarding_v1';

interface OnboardingRecord {
  dismissed: true;
  city?: string;
}

function hasUserContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== false;
}

/** Старый dashboard или любые старые пользовательские данные исключают onboarding. */
export async function shouldShowOnboarding(): Promise<boolean> {
  const [record, dashboard, backupV1, backupV2] = await Promise.all([
    StorageAdapter.get<unknown>(ONBOARDING_STORAGE_KEY, null),
    StorageAdapter.get<unknown>(STORAGE_KEYS.DASHBOARD, null),
    StorageAdapter.get<unknown>(STORAGE_KEYS.DASHBOARD_BACKUP_V1, null),
    StorageAdapter.get<unknown>(STORAGE_KEYS.DASHBOARD_BACKUP_V2, null),
  ]);
  if (
    typeof record === 'object' &&
    record !== null &&
    'dismissed' in record &&
    record.dismissed === true
  ) {
    return false;
  }
  if (dashboard !== null || backupV1 !== null || backupV2 !== null) return false;

  const legacyKeys = userContentKeys([]);
  const legacyValues = await Promise.all(
    legacyKeys.map((key) => StorageAdapter.get<unknown>(key, null)),
  );
  return !legacyValues.some(hasUserContent);
}

export async function finishOnboarding(options: {
  accepted: boolean;
  preset: SpacePreset;
  city: string;
}): Promise<boolean> {
  const current = await StorageAdapter.get<unknown>(ONBOARDING_STORAGE_KEY, null);
  if (
    typeof current === 'object' &&
    current !== null &&
    'dismissed' in current &&
    current.dismissed === true
  ) {
    return false;
  }

  if (options.accepted) {
    await useAppStore.getState().setCity(options.city);
  }
  // Маркер записывается до seed: повторный mount не создаст раскладку второй раз.
  const record: OnboardingRecord = {
    dismissed: true,
    ...(options.accepted && options.city.trim() ? { city: options.city.trim().slice(0, 100) } : {}),
  };
  await StorageAdapter.set(ONBOARDING_STORAGE_KEY, record);
  if (!options.accepted) return true;
  return useDashboardStore.getState().applyOnboardingPreset(options.preset);
}
