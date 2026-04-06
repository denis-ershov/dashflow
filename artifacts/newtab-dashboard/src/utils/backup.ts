import { getLocal, setLocal, getSetting, setSetting, STORAGE_KEYS } from "../store/storage";

export const BACKUP_VERSION = 1;

// Keys we read/write via chrome.storage.sync
const SYNC_KEYS = [
  STORAGE_KEYS.theme,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.weatherCity,
  STORAGE_KEYS.weatherUnit,
] as const;

// Keys we read/write via chrome.storage.local (exchange-rate cache excluded)
const LOCAL_KEYS = [
  STORAGE_KEYS.layouts,
  STORAGE_KEYS.todos,
  STORAGE_KEYS.quicklinks,
  STORAGE_KEYS.bookmarks,
  STORAGE_KEYS.bookmarkItems,
  STORAGE_KEYS.weatherApiKey,
  STORAGE_KEYS.calendar,
  STORAGE_KEYS.notes,
  STORAGE_KEYS.pomodoro,
  STORAGE_KEYS.habits,
  STORAGE_KEYS.currency,   // stripped of rate-cache fields below
] as const;

// Currency fields that hold fetched exchange-rate cache — excluded from backup
const CURRENCY_RATE_FIELDS: ReadonlyArray<string> = ["rates", "ratesBase", "ratesTimestamp"];

// At least one of these keys must be present for a backup to be considered valid
const REQUIRED_KEYS: ReadonlyArray<string> = [STORAGE_KEYS.layouts, STORAGE_KEYS.settings];

export class BackupError extends Error {
  constructor(public readonly code: "invalid_json" | "invalid_format" | "version_mismatch") {
    super(code);
  }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export async function exportDashboard(): Promise<void> {
  const data: Record<string, unknown> = {};

  for (const key of LOCAL_KEYS) {
    const value = await getLocal<unknown>(key, null);
    // Strip ephemeral rate-cache from currency entry
    if (key === STORAGE_KEYS.currency && value && typeof value === "object") {
      const stripped = { ...(value as Record<string, unknown>) };
      for (const f of CURRENCY_RATE_FIELDS) delete stripped[f];
      data[key] = stripped;
    } else {
      data[key] = value;
    }
  }

  for (const key of SYNC_KEYS) {
    data[key] = await getSetting<unknown>(key, null);
  }

  data[STORAGE_KEYS.gridSchemaVersion] = await getLocal<number>(STORAGE_KEYS.gridSchemaVersion, 3);

  const backup = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

/**
 * Parses and restores a backup file.
 * Throws `BackupError` on invalid/incompatible files.
 * Does NOT call `window.location.reload()` — callers should do that
 * after showing a success message to the user.
 */
export async function importDashboard(file: File): Promise<void> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError("invalid_json");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    !("data" in parsed) ||
    typeof (parsed as Record<string, unknown>).data !== "object" ||
    (parsed as Record<string, unknown>).data === null
  ) {
    throw new BackupError("invalid_format");
  }

  const b = parsed as { version: unknown; data: Record<string, unknown> };

  if (b.version !== BACKUP_VERSION) {
    throw new BackupError("version_mismatch");
  }

  const { data } = b;

  // Require at least one expected top-level key so we don't accept arbitrary JSON
  const hasExpectedKey = REQUIRED_KEYS.some((k) => k in data && data[k] !== null && data[k] !== undefined);
  if (!hasExpectedKey) {
    throw new BackupError("invalid_format");
  }

  const writes: Promise<void>[] = [];

  // Write ALL managed keys that appear in the backup, including null values.
  // This ensures a full snapshot restore — null overwrites stale destination
  // data so the next load re-initialises from defaults instead of stale state.
  for (const key of LOCAL_KEYS) {
    if (key in data) {
      writes.push(setLocal(key, data[key]));
    }
  }
  for (const key of SYNC_KEYS) {
    if (key in data) {
      writes.push(setSetting(key, data[key]));
    }
  }
  if (STORAGE_KEYS.gridSchemaVersion in data) {
    writes.push(setLocal(STORAGE_KEYS.gridSchemaVersion, data[STORAGE_KEYS.gridSchemaVersion]));
  }

  await Promise.all(writes);
  // Reload is intentionally NOT called here — the UI layer shows a success
  // message first, then schedules reload after a short delay.
}
