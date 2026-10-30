import { StorageAdapter } from './StorageAdapter';
import { STORAGE_KEYS } from './keys';

/**
 * Содержимое, которое пользователь вводит в виджеты: задачи, привычки, заметки, быстрые ссылки.
 * Хранится вне стора дашборда — в общем ключе виджета и в копии экземпляра `<ключ>_<instanceId>`.
 *
 * Плагины и их данные сюда намеренно не входят: восстановление плагина из файла обошло бы
 * окно согласия на права доступа (PermissionConsentModal).
 */

type ContentKind = 'todos' | 'habits' | 'notes' | 'links';

const CONTENT_BASE_KEYS: Readonly<Record<string, ContentKind>> = {
  [STORAGE_KEYS.TODO_ITEMS]: 'todos',
  [STORAGE_KEYS.HABIT_ITEMS]: 'habits',
  [STORAGE_KEYS.NOTES_CONTENT]: 'notes',
  [STORAGE_KEYS.QUICK_LINKS]: 'links',
};

/** Ограничения против раздутого или повреждённого файла */
export const USER_CONTENT_LIMITS = {
  maxItems: 1000,
  maxTextLength: 2000,
  maxNoteLength: 100_000,
  maxKeys: 200,
} as const;

const INSTANCE_ID = /^[A-Za-z0-9_-]{1,100}$/;

export type UserContentSnapshot = Record<string, unknown>;

/** Ключ хранилища → вид содержимого, или null, если ключ не относится к содержимому виджетов */
export function contentKindOf(key: string): ContentKind | null {
  for (const [base, kind] of Object.entries(CONTENT_BASE_KEYS)) {
    if (key === base) return kind;
    if (key.startsWith(`${base}_`) && INSTANCE_ID.test(key.slice(base.length + 1))) return kind;
  }
  return null;
}

/** Все ключи содержимого: общие и копии перечисленных экземпляров */
export function userContentKeys(instanceIds: readonly string[]): string[] {
  const safeIds = instanceIds.filter((id) => INSTANCE_ID.test(id));
  return Object.keys(CONTENT_BASE_KEYS).flatMap((base) => [
    base,
    ...safeIds.map((id) => `${base}_${id}`),
  ]);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isShortText = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= USER_CONTENT_LIMITS.maxTextLength;

const isHttpUrl = (v: unknown): boolean => {
  if (!isShortText(v)) return false;
  try {
    const { protocol } = new URL(v);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const ITEM_VALIDATORS: Record<Exclude<ContentKind, 'notes'>, (item: unknown) => boolean> = {
  todos: (item) =>
    isObject(item) &&
    isShortText(item.id) &&
    isShortText(item.text) &&
    typeof item.completed === 'boolean' &&
    ['low', 'medium', 'high'].includes(item.priority as string),
  habits: (item) =>
    isObject(item) &&
    isShortText(item.id) &&
    isShortText(item.title) &&
    isObject(item.history) &&
    Object.entries(item.history).every(
      ([day, done]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof done === 'boolean',
    ),
  links: (item) =>
    isObject(item) &&
    isShortText(item.id) &&
    isShortText(item.title) &&
    isHttpUrl(item.url) &&
    (item.icon === undefined || isShortText(item.icon)),
};

/** Проверяет значение по виду содержимого; невалидное значение не восстанавливается целиком */
export function isValidContent(kind: ContentKind, value: unknown): boolean {
  if (kind === 'notes') {
    return typeof value === 'string' && value.length <= USER_CONTENT_LIMITS.maxNoteLength;
  }
  return (
    Array.isArray(value) &&
    value.length <= USER_CONTENT_LIMITS.maxItems &&
    value.every(ITEM_VALIDATORS[kind])
  );
}

/** Читает содержимое виджетов для экспорта; отсутствующие ключи пропускаются */
export async function collectUserContent(
  instanceIds: readonly string[],
): Promise<UserContentSnapshot> {
  const missing = Symbol('missing');
  const entries = await Promise.all(
    userContentKeys(instanceIds).map(async (key) => {
      const value = await StorageAdapter.get<unknown>(key, missing);
      return [key, value] as const;
    }),
  );
  return Object.fromEntries(entries.filter(([, value]) => value !== missing));
}

export interface RestoreResult {
  restored: string[];
  /** Ключи из файла, которые не относятся к содержимому или не прошли проверку */
  rejected: string[];
}

/**
 * Восстанавливает содержимое из файла экспорта. Пишутся только известные ключи с валидными
 * значениями; всё остальное отбрасывается, чтобы файл не мог перезаписать произвольные настройки.
 */
export async function restoreUserContent(snapshot: unknown): Promise<RestoreResult> {
  const result: RestoreResult = { restored: [], rejected: [] };
  if (!isObject(snapshot)) return result;

  const entries = Object.entries(snapshot).slice(0, USER_CONTENT_LIMITS.maxKeys);
  for (const [key, value] of entries) {
    const kind = contentKindOf(key);
    if (!kind || !isValidContent(kind, value)) {
      result.rejected.push(key);
      continue;
    }
    await StorageAdapter.set(key, value);
    result.restored.push(key);
  }
  return result;
}
